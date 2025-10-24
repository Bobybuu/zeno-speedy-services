# users/otp_service.py
import os
from twilio.rest import Client
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class MultiChannelOTPService:
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.phone_number = settings.TWILIO_PHONE_NUMBER
        self.client = Client(self.account_sid, self.auth_token)
        # WhatsApp disabled for now
        # self.whatsapp_from = 'whatsapp:+14155238886'  # Twilio WhatsApp sandbox
    
    def send_otp(self, phone_number, otp, preferred_channel=None):
        """
        Send OTP via user's preferred channel with fallbacks
        FORCE VOICE for now due to SMS/WhatsApp restrictions
        Channels: 'voice' only (WhatsApp disabled, SMS commented)
        """
        # FORCE VOICE for all requests - remove this after other channels are fixed
        logger.info(f"FORCING VOICE OTP for {phone_number}. Original preference: {preferred_channel}")
        preferred_channel = 'voice'
        
        # Only voice is enabled for now
        channel_order = ['voice']
        
        channels_attempted = []
        
        # Try each channel in order (only voice for now)
        for channel in channel_order:
            if channel == 'voice':
                result = self._send_voice_otp(phone_number, otp)
            # WhatsApp disabled
            # elif channel == 'whatsapp':
            #     result = self._send_whatsapp_otp(phone_number, otp)
            # SMS commented out
            # else:  # sms
            #     result = self._send_sms_otp(phone_number, otp)
            
            channels_attempted.append((channel, result))
            
            if result['success']:
                logger.info(f"OTP sent via {channel} to {phone_number}")
                return {
                    'success': True,
                    'channel_used': channel,
                    'preferred_channel': preferred_channel,
                    'channels_attempted': channels_attempted,
                    'details': result
                }
        
        # Voice channel failed
        logger.error(f"Voice OTP failed for {phone_number}")
        return {
            'success': False,
            'channel_used': None,
            'preferred_channel': preferred_channel,
            'channels_attempted': channels_attempted,
            'error': 'Voice OTP delivery failed'
        }
    
    def _send_whatsapp_otp(self, phone_number, otp_code):
        """Send OTP via WhatsApp - DISABLED"""
        logger.warning(f"WhatsApp OTP attempted but disabled for {phone_number}")
        return {
            'success': False,
            'error': 'WhatsApp OTP is currently disabled',
            'error_code': 'WHATSAPP_DISABLED'
        }
    
    def _send_voice_otp(self, phone_number, otp_code):
        """Send OTP via Voice Call - PRIMARY CHANNEL"""
        try:
            otp_digits = '. '.join(list(otp_code))
            
            twiml = f'''
            <Response>
                <Say voice="alice" language="en-KE">
                    Hello. This is Zeno Services.
                    Your verification code is: {otp_digits}.
                    I repeat: {otp_digits}.
                    This code will expire in 10 minutes.
                    Thank you!
                </Say>
                <Pause length="1"/>
                <Say voice="alice">
                    Again, your code is: {otp_digits}
                </Say>
            </Response>
            '''
            
            call = self.client.calls.create(
                twiml=twiml,
                to=phone_number,
                from_=self.phone_number,
                timeout=30
            )
            
            logger.info(f"Voice OTP initiated for {phone_number}, Call SID: {call.sid}")
            return {
                'success': True,
                'call_sid': call.sid,
                'status': call.status
            }
            
        except Exception as e:
            logger.error(f"Voice OTP failed for {phone_number}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': getattr(e, 'code', 'Unknown')
            }
    
    def _send_sms_otp(self, phone_number, otp_code):
        """Send OTP via SMS - COMMENTED OUT due to Kenya restrictions"""
        logger.warning(f"SMS OTP attempted but commented out for {phone_number}")
        return {
            'success': False,
            'error': 'SMS OTP is currently disabled for Kenya',
            'error_code': 'SMS_DISABLED'
        }

# Fallback OTP service for development
class DevelopmentOTPService:
    def send_otp(self, phone_number, otp, preferred_channel=None):
        print(f"🔐 DEV OTP for {phone_number}: {otp}")
        print(f"📱 Original preferred channel: {preferred_channel}")
        print(f"🔊 FORCING VOICE OTP (other channels disabled)")
        print("📞 Voice call would be initiated")
        return {
            'success': True,
            'channel_used': 'voice',
            'preferred_channel': 'voice',
            'channels_attempted': [('voice', {'success': True})],
            'details': {'simulated': True, 'message': 'Voice OTP would be sent'}
        }

# Use appropriate service based on environment
def get_otp_service():
    if settings.DEBUG and not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN]):
        return DevelopmentOTPService()
    return MultiChannelOTPService()