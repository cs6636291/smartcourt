from datetime import date, datetime, timedelta
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from .models import Court, Appointment
from .serializers import CourtSerializer, AppointmentSerializer

class CourtStatusView(APIView):
    """
    Endpoint สำหรับหน้าแรก: แสดงสถานะสนามทุกสนามตามวันและเวลาที่เลือก
    Guest สามารถเรียกดูได้ (Permission: AllowAny)
    Query params: ?date=YYYY-MM-DD&time=HH:00
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        today = date.today()
        selected_date_str = request.query_params.get('date')
        selected_time_str = request.query_params.get('time', '08:00')

        if selected_date_str:
            try:
                selected_date = datetime.strptime(selected_date_str, '%Y-%m-%d').date()
            except ValueError:
                selected_date = today
        else:
            selected_date = today

        # ดึงรายชื่อสนามทั้งหมด
        courts = Court.objects.all()

        # ดึงการจองที่ confirmed ในวันและเวลานั้น
        booked_court_ids = Appointment.objects.filter(
            date=selected_date,
            start_time__startswith=selected_time_str[:2],
            status='confirmed'
        ).values_list('court_id', flat=True)

        results_floor_3 = []
        results_floor_7 = []

        for court in courts:
            is_available = court.id not in booked_court_ids
            court_data = {
                'id': court.id,
                'name': court.name,
                'floor': court.floor,
                'sport_type': court.sport_type,
                'is_available': is_available,
                'status_text': 'ว่าง' if is_available else 'เต็ม',
            }
            if court.floor == '3':
                results_floor_3.append(court_data)
            else:
                results_floor_7.append(court_data)

        # รายการช่วงเวลาสำเร็จรูป 08:00 - 20:00 ห่างกัน 1 ชม. (รวม 12 ช่องเวลา)
        time_slots = [f"{hour:02d}:00" for hour in range(8, 20)]

        # รายการวันจองล่วงหน้า 5 วันนับจากปัจจุบัน
        allowed_dates = [(today + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(5)]

        return Response({
            'selected_date': selected_date.strftime('%Y-%m-%d'),
            'selected_time': selected_time_str,
            'time_slots': time_slots,
            'allowed_dates': allowed_dates,
            'floor_3': results_floor_3,
            'floor_7': results_floor_7,
        })


class AppointmentCreateView(generics.CreateAPIView):
    """
    จองสนาม: ต้องล็อกอิน (IsAuthenticated)
    ตรวจสอบเงื่อนไข:
    1. จองล่วงหน้าได้ไม่เกิน 5 วันนับจากวันปัจจุบัน
    2. 1 ครั้ง / 1 user / 1 วัน
    3. เวลาสำเร็จรูป 08:00 - 20:00 (1 ชม.)
    4. ห้ามจองเวลาที่สนามเต็ม
    """
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        court_id = request.data.get('court')
        book_date_str = request.data.get('date')
        start_time_str = request.data.get('start_time')

        if not all([court_id, book_date_str, start_time_str]):
            return Response({'error': 'กรุณาระบุสนาม วันที่ และเวลาให้ครบถ้วน'}, status=status.HTTP_400_BAD_REQUEST)

        court = get_object_or_404(Court, pk=court_id)
        
        try:
            book_date = datetime.strptime(book_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. เช็คช่วงเวลา 5 วัน
        today = date.today()
        max_date = today + timedelta(days=4)
        if book_date < today or book_date > max_date:
            return Response({'error': 'สามารถจองสนามล่วงหน้าได้ไม่เกิน 5 วันนับจากวันปัจจุบัน'}, status=status.HTTP_400_BAD_REQUEST)

        # คำนวณ end_time (1 ชม. ถัดไป)
        try:
            start_hour = int(start_time_str.split(':')[0])
            start_time = datetime.strptime(f"{start_hour:02d}:00:00", '%H:%M:%S').time()
            end_time = datetime.strptime(f"{(start_hour + 1):02d}:00:00", '%H:%M:%S').time()
        except Exception:
            return Response({'error': 'รูปแบบเวลาไม่ถูกต้อง'}, status=status.HTTP_400_BAD_REQUEST)

        appointment = Appointment(
            user=request.user,
            court=court,
            date=book_date,
            start_time=start_time,
            end_time=end_time,
            status='confirmed'
        )

        try:
            appointment.save()
        except ValidationError as e:
            return Response({'error': e.messages[0] if hasattr(e, 'messages') else str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'message': 'จองสนามสำเร็จเรียบร้อยแล้ว',
            'appointment': AppointmentSerializer(appointment).data
        }, status=status.HTTP_201_CREATED)


class MyAppointmentsView(generics.ListAPIView):
    """
    ดูรายการจองของตนเอง
    """
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Appointment.objects.filter(user=self.request.user).order_by('-date', '-start_time')


class AppointmentCancelView(APIView):
    """
    ยกเลิกการจอง
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        appointment = get_object_or_404(Appointment, pk=pk, user=request.user)
        if appointment.status == 'cancelled':
            return Response({'message': 'การจองนี้ถูกยกเลิกไปแล้ว'}, status=status.HTTP_400_BAD_REQUEST)

        appointment.status = 'cancelled'
        appointment.save()
        return Response({'message': 'ยกเลิกการจองสำเร็จ'})
