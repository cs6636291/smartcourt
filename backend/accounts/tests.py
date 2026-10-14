from unittest.mock import patch
import re
from django.core import mail
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class RegistrationOtpTests(APITestCase):
    registration = {
        'email': 'newstudent@example.com',
        'password': 'secure123',
        'first_name': 'สมชาย',
        'last_name': 'ใจดี',
        'nickname': 'กาย',
        'gender': 'male',
        'std_id': '6501012345678',
    }

    def setUp(self):
        cache.clear()

    def tearDown(self):
        cache.clear()

    def test_registration_rejects_email_without_verified_otp(self):
        response = self.client.post('/api/accounts/register/', self.registration, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'กรุณายืนยันอีเมลด้วย OTP ก่อนสมัครสมาชิก')

    def test_registration_accepts_email_after_verified_otp(self):
        self.client.post('/api/accounts/send-otp/', {'email': self.registration['email']})
        otp = re.search(r'\b\d{6}\b', mail.outbox[-1].body).group()
        verify_response = self.client.post(
            '/api/accounts/verify-otp/',
            {'email': 'newstudent@example.com', 'otp': otp},
            format='json',
        )
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)

        response = self.client.post('/api/accounts/register/', {
            **self.registration, 'verification_token': verify_response.data['verification_token'],
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(cache.get('otp_verified_newstudent@example.com'))

    def test_smtp_failure_does_not_expose_otp_or_internal_error(self):
        with patch('accounts.views.send_mail', side_effect=RuntimeError('private smtp secret')):
            response = self.client.post('/api/accounts/send-otp/', {'email': self.registration['email']})
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('otp', response.data)
        self.assertNotIn('private smtp secret', str(response.data))

    def test_verified_email_alone_cannot_register(self):
        self.test_registration_accepts_email_after_verified_otp()
        # A valid email-only verification flag must not authenticate another client.
        cache.set('otp_verified_attacker@example.com', True, 600)
        response = self.client.post('/api/accounts/register/', {**self.registration, 'email': 'attacker@example.com'})
        self.assertEqual(response.status_code, 400)

    def test_send_cooldown_normalizes_email(self):
        first = self.client.post('/api/accounts/send-otp/', {'email': ' Student@Example.com '})
        second = self.client.post('/api/accounts/send-otp/', {'email': 'student@example.com'})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.data['email'], 'student@example.com')
        self.assertEqual(second.status_code, 429)
        self.assertEqual(len(mail.outbox), 1)

    def test_wrong_attempts_lock_challenge_and_valid_otp_cannot_be_reused(self):
        self.client.post('/api/accounts/send-otp/', {'email': self.registration['email']})
        otp = re.search(r'\b\d{6}\b', mail.outbox[-1].body).group()
        for _ in range(5):
            response = self.client.post('/api/accounts/verify-otp/', {'email': self.registration['email'], 'otp': '000000' if otp != '000000' else '999999'})
        self.assertEqual(response.status_code, 429)
        self.assertEqual(self.client.post('/api/accounts/verify-otp/', {'email': self.registration['email'], 'otp': otp}).status_code, 400)

    def verified_payload(self):
        email = self.registration['email']
        self.assertEqual(self.client.post('/api/accounts/send-otp/', {'email': email}).status_code, 200)
        otp = re.search(r'\b\d{6}\b', mail.outbox[-1].body).group()
        response = self.client.post('/api/accounts/verify-otp/', {'email': email, 'otp': otp})
        self.assertEqual(response.status_code, 200)
        return {**self.registration, 'verification_token': response.data['verification_token']}, otp

    def test_verification_token_bound_to_email_and_single_use(self):
        payload, otp = self.verified_payload()
        self.assertEqual(self.client.post('/api/accounts/register/', {**payload, 'email': 'different@example.com'}).status_code, 400)
        self.assertEqual(self.client.post('/api/accounts/register/', payload).status_code, 201)
        self.assertEqual(self.client.post('/api/accounts/register/', payload).status_code, 400)
        self.assertEqual(self.client.post('/api/accounts/verify-otp/', {'email': payload['email'], 'otp': otp}).status_code, 400)

    def test_expired_challenge_cannot_verify(self):
        from .otp import cache_key
        self.client.post('/api/accounts/send-otp/', {'email': self.registration['email']})
        otp = re.search(r'\b\d{6}\b', mail.outbox[-1].body).group()
        key = cache_key('challenge', self.registration['email'])
        challenge = cache.get(key)
        cache.set(key, {**challenge, 'expires': 0}, 300)
        self.assertEqual(self.client.post('/api/accounts/verify-otp/', {'email': self.registration['email'], 'otp': otp}).status_code, 400)

    def test_expired_registration_token_rejected(self):
        from .otp import cache_key
        payload, _ = self.verified_payload()
        cache.delete(cache_key('verified', payload['verification_token']))
        self.assertEqual(self.client.post('/api/accounts/register/', payload).status_code, 400)

    def test_registration_validation_password_names_student_id(self):
        payload, _ = self.verified_payload()
        for values in ({'password': 'short'}, {'password': 'abcdefgh'}, {'first_name': ' '}, {'last_name': ''}, {'std_id': '123'}, {'std_id': 'x' * 13}):
            response = self.client.post('/api/accounts/register/', {**payload, **values})
            self.assertEqual(response.status_code, 400)
        self.assertFalse(get_user_model().objects.filter(email=payload['email']).exists())

    def test_registration_rejects_duplicate_student_id_and_email_case(self):
        payload, _ = self.verified_payload()
        get_user_model().objects.create_user(username='existing', email='existing@example.com', std_id=payload['std_id'])
        self.assertEqual(self.client.post('/api/accounts/register/', payload).status_code, 400)
        get_user_model().objects.create_user(username='sameemail', email=payload['email'].upper(), std_id='9999999999999')
        self.assertEqual(self.client.post('/api/accounts/register/', {**payload, 'std_id': '1111111111111'}).status_code, 400)

    def test_two_email_domains_same_prefix_register_without_username_collision(self):
        payload, _ = self.verified_payload()
        get_user_model().objects.create_user(username='newstudent', email='newstudent@other.example', std_id='9999999999999')
        self.assertEqual(self.client.post('/api/accounts/register/', payload).status_code, 201)

    def test_send_limits_ip_across_different_emails(self):
        with patch('accounts.views.send_mail', return_value=1):
            for index in range(20):
                self.assertEqual(self.client.post('/api/accounts/send-otp/', {'email': f'student{index}@example.com'}).status_code, 200)
            self.assertEqual(self.client.post('/api/accounts/send-otp/', {'email': 'last@example.com'}).status_code, 429)

    def test_send_email_hourly_limit_survives_cooldown(self):
        from .otp import cache_key
        email = self.registration['email']
        with patch('accounts.views.send_mail', return_value=1):
            for _ in range(5):
                cache.delete(cache_key('cooldown', email))
                self.assertEqual(self.client.post('/api/accounts/send-otp/', {'email': email}).status_code, 200)
            cache.delete(cache_key('cooldown', email))
            self.assertEqual(self.client.post('/api/accounts/send-otp/', {'email': email}).status_code, 429)

    def test_send_rejects_invalid_email_and_nonstring_input(self):
        for email in ('invalid', None, ['wrong']):
            self.assertEqual(self.client.post('/api/accounts/send-otp/', {'email': email}, format='json').status_code, 400)

    def test_registration_database_conflict_is_safe_client_error(self):
        from django.db import IntegrityError
        payload, _ = self.verified_payload()
        with patch('accounts.serializers.RegisterSerializer.create', side_effect=IntegrityError('private constraint')):
            response = self.client.post('/api/accounts/register/', payload)
        self.assertEqual(response.status_code, 400)
        self.assertNotIn('private constraint', str(response.data))

    def test_verify_ip_limit_covers_missing_and_invalid_challenges(self):
        for _ in range(60):
            self.assertEqual(self.client.post('/api/accounts/verify-otp/', {'email': self.registration['email'], 'otp': '123456'}).status_code, 400)
        self.assertEqual(self.client.post('/api/accounts/verify-otp/', {'email': self.registration['email'], 'otp': '123456'}).status_code, 429)


class ProfileAndJwtTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(username='member', email='member@example.com', password='secure123', first_name='สมชาย', last_name='ใจดี', std_id='6501012345678')

    def test_profile_email_change_rejected(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch('/api/accounts/profile/', {'email': 'new@example.com'})
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'member@example.com')

    def test_profile_requires_exact_student_id_and_nonblank_names(self):
        self.client.force_authenticate(self.user)
        for payload in ({'std_id': '123'}, {'std_id': '๑' * 13}, {'first_name': '   '}, {'last_name': ''}):
            self.assertEqual(self.client.patch('/api/accounts/profile/', payload).status_code, 400)

    def test_profile_save_and_duplicate_student_id(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch('/api/accounts/profile/', {'nickname': 'ใหม่', 'first_name': 'ชื่อใหม่'})
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.nickname, 'ใหม่')
        get_user_model().objects.create_user(username='other', email='other@example.com', std_id='6501012345679')
        self.assertEqual(self.client.patch('/api/accounts/profile/', {'std_id': '6501012345679'}).status_code, 400)

    def test_login_profile_refresh_and_invalid_credentials(self):
        response = self.client.post('/api/accounts/login/', {'email': ' MEMBER@EXAMPLE.COM ', 'password': 'secure123'})
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('password', response.data['user'])
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + response.data['access'])
        self.assertEqual(self.client.get('/api/accounts/profile/').status_code, 200)
        self.assertEqual(self.client.post('/api/accounts/token/refresh/', {'refresh': response.data['refresh']}).status_code, 200)
        self.assertEqual(self.client.post('/api/accounts/login/', {'email': self.user.email, 'password': 'wrong'}).status_code, 401)

    def test_profile_requires_authentication_and_expired_jwt_rejected(self):
        from datetime import timedelta
        from rest_framework_simplejwt.tokens import AccessToken
        self.assertEqual(self.client.get('/api/accounts/profile/').status_code, 401)
        token = AccessToken.for_user(self.user)
        token.set_exp(lifetime=timedelta(seconds=-1))
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + str(token))
        self.assertEqual(self.client.get('/api/accounts/profile/').status_code, 401)

    def test_logout_revokes_refresh_and_requires_token_owner(self):
        from rest_framework_simplejwt.tokens import RefreshToken
        token = RefreshToken.for_user(self.user)
        other = get_user_model().objects.create_user(username='logout-other', email='logout-other@example.com')
        self.client.force_authenticate(other)
        self.assertEqual(self.client.post('/api/accounts/logout/', {'refresh': str(token)}).status_code, 403)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post('/api/accounts/logout/', {'refresh': str(token)}).status_code, 200)
        self.assertEqual(self.client.post('/api/accounts/token/refresh/', {'refresh': str(token)}).status_code, 401)

    def test_logout_rejects_invalid_token(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post('/api/accounts/logout/', {'refresh': 'not-a-token'}).status_code, 400)
