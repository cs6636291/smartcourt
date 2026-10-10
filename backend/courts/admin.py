from django.contrib import admin
from .models import Court, Appointment

@admin.register(Court)
class CourtAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'floor', 'sport_type')
    list_filter = ('floor', 'sport_type')
    search_fields = ('name',)

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'court', 'user', 'date', 'start_time', 'end_time', 'status', 'booked_at')
    list_filter = ('status', 'date', 'court__floor')
    search_fields = ('user__first_name', 'user__last_name', 'user__email', 'court__name')
