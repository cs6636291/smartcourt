from datetime import datetime, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Appointment, Court


User = get_user_model()


class BookingApiTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			username='player-one',
			email='player-one@example.com',
			password='Password123',
			first_name='Player',
			last_name='One',
		)
		self.other_user = User.objects.create_user(
			username='player-two',
			email='player-two@example.com',
			password='Password123',
			first_name='Player',
			last_name='Two',
		)
		self.court = Court.objects.create(name='Court 1', floor='3', sport_type='badminton')
		self.other_court = Court.objects.create(name='Court 2', floor='7', sport_type='badminton')
		self.booking_date = timezone.localdate().isoformat()
		self.booking_payload = {
			'court': self.court.pk,
			'date': self.booking_date,
			'start_time': '08:00',
		}

	def test_guest_can_view_status_but_cannot_book(self):
		status_response = self.client.get('/api/courts/status/')
		booking_response = self.client.post('/api/courts/book/', self.booking_payload, format='json')

		self.assertEqual(status_response.status_code, status.HTTP_200_OK)
		self.assertEqual(booking_response.status_code, status.HTTP_401_UNAUTHORIZED)
		self.assertEqual(len(status_response.data['time_slots']), 12)
		self.assertEqual(len(status_response.data['allowed_dates']), 5)

	def test_status_filters_booked_slot_and_rejects_invalid_time(self):
		Appointment.objects.create(
			user=self.user,
			court=self.court,
			date=timezone.localdate(),
			start_time='08:00',
			end_time='09:00',
		)

		booked_response = self.client.get(
			'/api/courts/status/',
			{'date': self.booking_date, 'time': '08:00'},
		)
		next_slot_response = self.client.get(
			'/api/courts/status/',
			{'date': self.booking_date, 'time': '09:00'},
		)
		invalid_response = self.client.get('/api/courts/status/', {'time': '08:30'})

		self.assertFalse(booked_response.data['floor_3'][0]['is_available'])
		self.assertTrue(next_slot_response.data['floor_3'][0]['is_available'])
		self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)

	def test_schedule_returns_five_dates_with_available_slots_per_court(self):
		Appointment.objects.create(
			user=self.user,
			court=self.court,
			date=timezone.localdate(),
			start_time='08:00',
			end_time='09:00',
		)
		self.client.force_authenticate(user=self.user)

		response = self.client.get('/api/courts/schedule/')

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(len(response.data['dates']), 5)
		first_day_court = response.data['dates'][0]['courts'][0]
		self.assertNotIn('08:00', first_day_court['available_slots'])
		self.assertEqual(first_day_court['available_slots'], [])
		self.assertEqual(response.data['dates'][0]['courts'][1]['available_slots'], [])
		self.assertEqual(len(response.data['dates'][1]['courts'][0]['available_slots']), 12)

	def test_guest_cannot_view_booking_schedule(self):
		response = self.client.get('/api/courts/schedule/')

		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_past_slots_are_hidden_and_rejected_for_today(self):
		self.client.force_authenticate(user=self.user)
		mock_now = timezone.make_aware(datetime.combine(timezone.localdate(), datetime.strptime('10:30', '%H:%M').time()))

		with patch('courts.views.timezone.localtime', return_value=mock_now):
			schedule_response = self.client.get('/api/courts/schedule/')
			booking_response = self.client.post(
				'/api/courts/book/',
				{**self.booking_payload, 'start_time': '10:00'},
				format='json',
			)

		available = schedule_response.data['dates'][0]['courts'][0]['available_slots']
		self.assertNotIn('10:00', available)
		self.assertIn('11:00', available)
		self.assertEqual(booking_response.status_code, status.HTTP_400_BAD_REQUEST)

	def test_booking_rejects_invalid_slot_and_date_outside_five_days(self):
		self.client.force_authenticate(user=self.user)
		invalid_slot_payload = {**self.booking_payload, 'start_time': '20:00'}
		invalid_date_payload = {
			**self.booking_payload,
			'date': (timezone.localdate() + timedelta(days=5)).isoformat(),
		}

		invalid_slot_response = self.client.post(
			'/api/courts/book/', invalid_slot_payload, format='json'
		)
		invalid_date_response = self.client.post(
			'/api/courts/book/', invalid_date_payload, format='json'
		)

		self.assertEqual(invalid_slot_response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(invalid_date_response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(Appointment.objects.count(), 0)

	def test_user_can_book_once_per_day_and_cancel_to_release_slot(self):
		self.client.force_authenticate(user=self.user)
		future_payload = {
			**self.booking_payload,
			'date': (timezone.localdate() + timedelta(days=1)).isoformat(),
		}
		first_response = self.client.post(
			'/api/courts/book/', future_payload, format='json'
		)
		second_response = self.client.post(
			'/api/courts/book/',
			{**future_payload, 'court': self.other_court.pk, 'start_time': '09:00'},
			format='json',
		)

		self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)

		booking_id = first_response.data['appointment']['id']
		cancel_response = self.client.post(f'/api/courts/cancel/{booking_id}/')
		replacement_response = self.client.post(
			'/api/courts/book/', future_payload, format='json'
		)

		self.assertEqual(cancel_response.status_code, status.HTTP_200_OK)
		self.assertEqual(replacement_response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(Appointment.objects.filter(status='confirmed').count(), 1)

	def test_user_cannot_cancel_another_users_booking(self):
		appointment = Appointment.objects.create(
			user=self.user,
			court=self.court,
			date=timezone.localdate(),
			start_time='08:00',
			end_time='09:00',
		)
		self.client.force_authenticate(user=self.other_user)

		response = self.client.post(f'/api/courts/cancel/{appointment.pk}/')

		self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
		appointment.refresh_from_db()
		self.assertEqual(appointment.status, 'confirmed')
