from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase


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

    def tearDown(self):
        cache.clear()

    def test_registration_rejects_email_without_verified_otp(self):
        response = self.client.post('/api/accounts/register/', self.registration, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'กรุณายืนยันอีเมลด้วย OTP ก่อนสมัครสมาชิก')

    def test_registration_accepts_email_after_verified_otp(self):
        cache.set('otp_newstudent@example.com', '123456', timeout=300)
        verify_response = self.client.post(
            '/api/accounts/verify-otp/',
            {'email': 'newstudent@example.com', 'otp': '123456'},
            format='json',
        )
        self.assertEqual(verify_response.status_code, status.HTTP_200_OK)

        response = self.client.post('/api/accounts/register/', self.registration, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(cache.get('otp_verified_newstudent@example.com'))
