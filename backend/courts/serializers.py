from rest_framework import serializers
from .models import Court, Appointment
from accounts.serializers import UserSerializer

class CourtSerializer(serializers.ModelSerializer):
    class Meta:
        model = Court
        fields = ['id', 'name', 'floor', 'sport_type', 'description']


class AppointmentSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    court_detail = CourtSerializer(source='court', read_only=True)

    class Meta:
        model = Appointment
        fields = ['id', 'user', 'court', 'user_detail', 'court_detail', 'date', 'start_time', 'end_time', 'status', 'booked_at']
        read_only_fields = ['id', 'user', 'status', 'booked_at']
