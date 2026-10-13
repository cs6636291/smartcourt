from datetime import date, datetime, timedelta
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import Court, Appointment
from .serializers import CourtSerializer, AppointmentSerializer

TIME_SLOTS = tuple(f'{hour:02d}:00' for hour in range(8, 20))


class CourtStatusView(APIView):
    """
    Endpoint สำหรับหน้าแรก: แสดงสถานะสนามทุกสนามตามวันและเวลาที่เลือก
    Guest สามารถเรียกดูได้ (Permission: AllowAny)
    Query params: ?date=YYYY-MM-DD&time=HH:00
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        today = timezone.localdate()
        selected_date_str = request.query_params.get('date')
        selected_time_str = request.query_params.get('time', '08:00')

        if selected_date_str:
            try:
                selected_date = date.fromisoformat(selected_date_str)
            except ValueError:
                return Response(
                    {'error': 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            selected_date = today

        if selected_time_str not in TIME_SLOTS:
            return Response(
                {'error': 'กรุณาเลือกช่วงเวลาระหว่าง 08:00 ถึง 19:00'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        selected_time = datetime.strptime(selected_time_str, '%H:%M').time()
        courts = Court.objects.all()
        booked_court_ids = set(Appointment.objects.filter(
            date=selected_date,
            start_time__lte=selected_time,
            end_time__gt=selected_time,
            status='confirmed'
        ).values_list('court_id', flat=True))
        user_has_booking = request.user.is_authenticated and Appointment.objects.filter(
            user=request.user,
            date=selected_date,
            status='confirmed',
        ).exists()

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
                'status_text': 'ว่าง' if is_available else 'จองแล้ว',
            }
            if court.floor == '3':
                results_floor_3.append(court_data)
            else:
                results_floor_7.append(court_data)

        allowed_dates = [(today + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(5)]

        return Response({
            'selected_date': selected_date.strftime('%Y-%m-%d'),
            'selected_time': selected_time_str,
            'user_has_booking': user_has_booking,
            'time_slots': TIME_SLOTS,
            'allowed_dates': allowed_dates,
            'floor_3': results_floor_3,
            'floor_7': results_floor_7,
        })


class CourtScheduleView(APIView):
    """Return the five-day booking grid with every free one-hour slot."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        local_now = timezone.localtime()
        today = local_now.date()
        allowed_dates = [today + timedelta(days=offset) for offset in range(5)]
        courts = list(Court.objects.all().order_by('floor', 'id'))
        booked_slots = {
            (appointment_date, court_id, start_time.strftime('%H:%M'))
            for appointment_date, court_id, start_time in Appointment.objects.filter(
                date__range=(allowed_dates[0], allowed_dates[-1]),
                status='confirmed',
            ).values_list('date', 'court_id', 'start_time')
        }
        user_booking_dates = set(Appointment.objects.filter(
            user=request.user,
            date__range=(allowed_dates[0], allowed_dates[-1]),
            status='confirmed',
        ).values_list('date', flat=True))

        dates = []
        for schedule_date in allowed_dates:
            court_rows = []
            for court in courts:
                available_slots = [
                    slot for slot in TIME_SLOTS
                    if (schedule_date, court.id, slot) not in booked_slots
                    and schedule_date not in user_booking_dates
                    and not (
                        schedule_date == today
                        and int(slot[:2]) * 60 <= local_now.hour * 60 + local_now.minute
                    )
                ]
                court_rows.append({
                    'id': court.id,
                    'name': court.name,
                    'floor': court.floor,
                    'sport_type': court.sport_type,
                    'available_slots': available_slots,
                })
            dates.append({
                'date': schedule_date.isoformat(),
                'user_has_booking': schedule_date in user_booking_dates,
                'courts': court_rows,
            })

        return Response({
            'time_slots': TIME_SLOTS,
            'dates': dates,
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
            book_date = date.fromisoformat(book_date_str)
        except (TypeError, ValueError):
            return Response({'error': 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)'}, status=status.HTTP_400_BAD_REQUEST)
        if book_date.isoformat() != book_date_str:
            return Response({'error': 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)'}, status=status.HTTP_400_BAD_REQUEST)

        local_now = timezone.localtime()
        today = local_now.date()
        if not today <= book_date <= today + timedelta(days=4):
            return Response({'error': 'สามารถจองสนามล่วงหน้าได้ไม่เกิน 5 วันนับจากวันปัจจุบัน'}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(start_time_str, str) or start_time_str not in TIME_SLOTS:
            return Response(
                {'error': 'กรุณาเลือกช่วงเวลาระหว่าง 08:00 ถึง 19:00 เป็นช่วงละ 1 ชั่วโมง'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        start_time = datetime.strptime(start_time_str, '%H:%M').time()
        if book_date == today and (
            start_time.hour * 60 + start_time.minute
            <= local_now.hour * 60 + local_now.minute
        ):
            return Response(
                {'error': 'ไม่สามารถจองช่วงเวลาที่ผ่านไปแล้วได้'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        end_time = datetime.strptime(
            f'{start_time.hour + 1:02d}:00', '%H:%M'
        ).time()

        appointment = Appointment(
            user=request.user,
            court=court,
            date=book_date,
            start_time=start_time,
            end_time=end_time,
            status='confirmed'
        )

        try:
            with transaction.atomic():
                appointment.save()
        except ValidationError as e:
            return Response({'error': e.messages[0] if hasattr(e, 'messages') else str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError:
            return Response(
                {'error': 'ช่วงเวลานี้ถูกจองแล้ว หรือคุณมีการจองในวันดังกล่าวแล้ว'},
                status=status.HTTP_409_CONFLICT,
            )

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
