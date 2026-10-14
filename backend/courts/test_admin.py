from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import IntegrityError, OperationalError, transaction
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Appointment, Court


User = get_user_model()


class CourtAdminTests(TestCase):
    """Exercise admin HTTP forms and persisted data, including permission denial."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_superuser(
            username='court-admin', email='court-admin@example.com', password='TestPassword123!',
        )
        cls.member = User.objects.create_user(
            username='court-member', email='court-member@example.com', password='TestPassword123!',
        )
        cls.staff = User.objects.create_user(
            username='court-staff', email='court-staff@example.com', password='TestPassword123!',
            is_staff=True,
        )
        cls.court = Court.objects.create(name='Admin court', floor='3', sport_type='basketball')

    def test_admin_creates_reads_updates_and_deletes_court(self):
        self.client.force_login(self.admin)
        payload = {'name': 'New court', 'floor': '7', 'sport_type': 'badminton', 'description': 'Test detail'}
        created = self.client.post(reverse('admin:courts_court_add'), payload)
        self.assertEqual(created.status_code, 302)
        court = Court.objects.get(name='New court')
        self.assertEqual(court.description, 'Test detail')
        listing = self.client.get(reverse('admin:courts_court_changelist'))
        self.assertContains(listing, 'New court')
        changed = self.client.post(
            reverse('admin:courts_court_change', args=[court.pk]),
            {**payload, 'name': 'Updated court', 'floor': '3'},
        )
        self.assertEqual(changed.status_code, 302)
        court.refresh_from_db()
        self.assertEqual((court.name, court.floor), ('Updated court', '3'))
        deleted = self.client.post(reverse('admin:courts_court_delete', args=[court.pk]), {'post': 'yes'})
        self.assertEqual(deleted.status_code, 302)
        self.assertFalse(Court.objects.filter(pk=court.pk).exists())

    def test_guest_and_member_cannot_access_or_modify_admin_courts(self):
        urls = [reverse('admin:courts_court_changelist'), reverse('admin:courts_court_add'),
                reverse('admin:courts_court_change', args=[self.court.pk]),
                reverse('admin:courts_court_delete', args=[self.court.pk])]
        for user in (None, self.member):
            self.client.logout()
            if user:
                self.client.force_login(user)
            for url in urls:
                with self.subTest(user=user, url=url):
                    self.assertEqual(self.client.get(url).status_code, 302)
                    self.assertEqual(self.client.post(url, {'name': 'Unauthorized', 'post': 'yes'}).status_code, 302)
        self.court.refresh_from_db()
        self.assertEqual(self.court.name, 'Admin court')
        self.assertEqual(Court.objects.count(), 1)

    def test_staff_without_model_permissions_is_forbidden(self):
        self.client.force_login(self.staff)
        urls = [reverse('admin:courts_court_changelist'), reverse('admin:courts_court_add'),
                reverse('admin:courts_court_change', args=[self.court.pk]),
                reverse('admin:courts_court_delete', args=[self.court.pk])]
        for url in urls:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 403)
                self.assertEqual(self.client.post(url, {'name': 'Unauthorized', 'post': 'yes'}).status_code, 403)
        self.assertTrue(Court.objects.filter(pk=self.court.pk, name='Admin court').exists())

    def test_admin_invalid_court_choice_does_not_save(self):
        self.client.force_login(self.admin)
        response = self.client.post(reverse('admin:courts_court_add'), {
            'name': 'Invalid court', 'floor': '99', 'sport_type': 'unknown',
        })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context['adminform'].form.errors)
        self.assertFalse(Court.objects.filter(name='Invalid court').exists())

    def test_admin_delete_confirmation_lists_booking_and_cascades_on_confirm(self):
        booking = Appointment.objects.create(
            user=self.member, court=self.court, date=timezone.localdate() + timedelta(days=1),
            start_time='08:00', end_time='09:00',
        )
        self.client.force_login(self.admin)
        url = reverse('admin:courts_court_delete', args=[self.court.pk])
        self.assertContains(self.client.get(url), str(booking))
        self.assertTrue(Appointment.objects.filter(pk=booking.pk).exists())
        self.assertEqual(self.client.post(url, {'post': 'yes'}).status_code, 302)
        self.assertFalse(Appointment.objects.filter(pk=booking.pk).exists())


class BookingIntegrityTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username='integrity-one', email='integrity-one@example.com')
        cls.other = User.objects.create_user(username='integrity-two', email='integrity-two@example.com')
        cls.court = Court.objects.create(name='Integrity court', floor='3')
        cls.other_court = Court.objects.create(name='Other integrity court', floor='7')

    def setUp(self):
        self.day = timezone.localdate() + timedelta(days=1)
        self.payload = {'court': self.court.pk, 'date': self.day.isoformat(), 'start_time': '08:00'}
        self.client.force_authenticate(self.user)

    def test_different_accounts_cannot_book_same_slot_but_can_book_next_hour(self):
        self.assertEqual(self.client.post('/api/courts/book/', self.payload, format='json').status_code, 201)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post('/api/courts/book/', self.payload, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/courts/book/', {**self.payload, 'start_time': '09:00'}, format='json').status_code, 201)
        self.assertEqual(Appointment.objects.filter(status='confirmed').count(), 2)

    def test_my_bookings_is_owner_isolated_and_guest_is_denied(self):
        own = Appointment.objects.create(user=self.user, court=self.court, date=self.day, start_time='08:00', end_time='09:00')
        Appointment.objects.create(user=self.other, court=self.other_court, date=self.day, start_time='08:00', end_time='09:00')
        response = self.client.get('/api/courts/my-bookings/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data], [own.pk])
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/courts/my-bookings/').status_code, 401)

    def test_repeat_cancellation_keeps_history(self):
        booking = Appointment.objects.create(user=self.user, court=self.court, date=self.day, start_time='08:00', end_time='09:00')
        url = f'/api/courts/cancel/{booking.pk}/'
        self.assertEqual(self.client.post(url).status_code, 200)
        self.assertEqual(self.client.post(url).status_code, 400)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'cancelled')
        self.assertEqual(Appointment.objects.count(), 1)

    def test_guest_cannot_cancel_booking(self):
        booking = Appointment.objects.create(user=self.user, court=self.court, date=self.day, start_time='08:00', end_time='09:00')
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post(f'/api/courts/cancel/{booking.pk}/').status_code, 401)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'confirmed')

    def test_invalid_booking_inputs_return_client_errors_without_writes(self):
        invalid_cases = [({'court': 'not-a-number'}, 400), ({'court': []}, 400),
                         ({'court': {'id': 1}}, 400), ({'court': True}, 400),
                         ({'court': 1.5}, 400), ({'court': -1}, 400),
                         ({'court': 9223372036854775808}, 400),
                         ({'court': '999999999999999999999'}, 400),
                         ({'court': 999999}, 404), ({'date': '2026-99-99'}, 400),
                         ({'date': ['bad']}, 400), ({'date': ''}, 400),
                         ({'start_time': '08:30'}, 400), ({'start_time': ['08:00']}, 400)]
        for changed, expected in invalid_cases:
            with self.subTest(changed=changed):
                response = self.client.post('/api/courts/book/', {**self.payload, **changed}, format='json')
                self.assertEqual(response.status_code, expected)
        self.assertEqual(Appointment.objects.count(), 0)

    def test_status_rejects_malformed_date(self):
        self.assertEqual(self.client.get('/api/courts/status/', {'date': 'invalid'}).status_code, 400)

    def test_database_constraints_reject_duplicate_slot_and_user_day_without_model_validation(self):
        # bulk_create deliberately bypasses Model.save/full_clean. This proves DB
        # constraints, not parallel request handling on SQLite.
        Appointment.objects.create(user=self.user, court=self.court, date=self.day, start_time='08:00', end_time='09:00')
        duplicate_cases = [(self.other, self.court, '08:00', '09:00'),
                           (self.user, self.other_court, '09:00', '10:00')]
        for user, court, start, end in duplicate_cases:
            with self.subTest(user=user.pk, court=court.pk):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    Appointment.objects.bulk_create([Appointment(
                        user=user, court=court, date=self.day, start_time=start, end_time=end,
                    )])
        self.assertEqual(Appointment.objects.count(), 1)

    def test_integrity_conflict_returns_409_instead_of_server_error(self):
        from unittest.mock import patch

        with patch('courts.views.Appointment.save', side_effect=IntegrityError('conflict')):
            response = self.client.post('/api/courts/book/', self.payload, format='json')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(Appointment.objects.count(), 0)

    def test_sqlite_locked_booking_returns_retryable_409(self):
        from unittest.mock import patch

        with patch('courts.views.Appointment.save', side_effect=OperationalError('database is locked')):
            response = self.client.post('/api/courts/book/', self.payload, format='json')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(Appointment.objects.count(), 0)

    def test_unrelated_database_error_is_not_disguised_as_booking_conflict(self):
        from unittest.mock import patch

        with patch('courts.views.Appointment.save', side_effect=OperationalError('no such table: courts_appointment')):
            with self.assertRaises(OperationalError):
                self.client.post('/api/courts/book/', self.payload, format='json')
