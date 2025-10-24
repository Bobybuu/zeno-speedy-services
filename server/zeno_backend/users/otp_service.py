# users/otp_service.py
import os
from twilio.rest import Client
from django.conf import settings

class OTPService:
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.phone_number = settings.TWILIO_PHONE_NUMBER
        self.client = Client(self.account_sid, self.auth_token)

    def send_otp(self, phone_number, otp):
        try:
            message = self.client.messages.create(
                body=f'Your Zeno Roadside Connect verification code is: {otp}. This code expires in 10 minutes.',
                from_=self.phone_number,
                to=phone_number
            )
            return True
        except Exception as e:
            print(f"Error sending OTP: {e}")
            return False

# Fallback OTP service for development (prints OTP to console)
class DevelopmentOTPService:
    def send_otp(self, phone_number, otp):
        print(f"DEV OTP for {phone_number}: {otp}")
        return True

# Use appropriate service based on environment
def get_otp_service():
    if settings.DEBUG and not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN]):
        return DevelopmentOTPService()
    return OTPService()