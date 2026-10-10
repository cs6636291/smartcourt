from django.urls import path
from .views import CourtStatusView, AppointmentCreateView, MyAppointmentsView, AppointmentCancelView

urlpatterns = [
    path('status/', CourtStatusView.as_view(), name='court_status'),
    path('book/', AppointmentCreateView.as_view(), name='appointment_book'),
    path('my-bookings/', MyAppointmentsView.as_view(), name='my_appointments'),
    path('cancel/<int:pk>/', AppointmentCancelView.as_view(), name='appointment_cancel'),
]
