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
        self.whatsapp_from = 'whatsapp:+14155238886'  # Twilio WhatsApp sandbox
    
    def send_otp(self, phone_number, otp, preferred_channel=None):
        """
        Send OTP via user's preferred channel with fallbacks
        Channels: 'whatsapp', 'voice', 'sms'
        """
        # Define channel priority based on preference
        if preferred_channel == 'whatsapp':
            channel_order = ['whatsapp', 'voice', 'sms']
        elif preferred_channel == 'voice':
            channel_order = ['voice', 'whatsapp', 'sms']
        elif preferred_channel == 'sms':
            channel_order = ['sms', 'whatsapp', 'voice']
        else:
            # Default priority: WhatsApp → Voice → SMS
            channel_order = ['whatsapp', 'voice', 'sms']
        
        channels_attempted = []
        
        # Try each channel in order
        for channel in channel_order:
            if channel == 'whatsapp':
                result = self._send_whatsapp_otp(phone_number, otp)
            elif channel == 'voice':
                result = self._send_voice_otp(phone_number, otp)
            else:  # sms
                result = self._send_sms_otp(phone_number, otp)
            
            channels_attempted.append((channel, result))
            
            if result['success']:
                logger.info(f"OTP sent via {channel} to {phone_number} (preferred: {preferred_channel})")
                return {
                    'success': True,
                    'channel_used': channel,
                    'preferred_channel': preferred_channel,
                    'channels_attempted': channels_attempted,
                    'details': result
                }
        
        # All channels failed
        logger.error(f"All OTP channels failed for {phone_number}. Preferred: {preferred_channel}")
        return {
            'success': False,
            'channel_used': None,
            'preferred_channel': preferred_channel,
            'channels_attempted': channels_attempted,
            'error': 'All delivery channels failed'
        }
    
    def _send_whatsapp_otp(self, phone_number, otp_code):
        """Send OTP via WhatsApp"""
        try:
            whatsapp_to = f"whatsapp:{phone_number}"
            
            message = self.client.messages.create(
                body=f"🔐 *Zeno Services Verification*\n\nYour verification code is: *{otp_code}*\n\nThis code expires in 10 minutes.\n\nDo not share this code with anyone.",
                from_=self.whatsapp_from,
                to=whatsapp_to
            )
            
            return {
                'success': True,
                'message_sid': message.sid,
                'status': message.status
            }
            
        except Exception as e:
            logger.warning(f"WhatsApp OTP failed for {phone_number}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': getattr(e, 'code', 'Unknown')
            }
    
    def _send_voice_otp(self, phone_number, otp_code):
        """Send OTP via Voice Call"""
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
            
            return {
                'success': True,
                'call_sid': call.sid,
                'status': call.status
            }
            
        except Exception as e:
            logger.warning(f"Voice OTP failed for {phone_number}: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'error_code': getattr(e, 'code', 'Unknown')
            }
    
    def _send_sms_otp(self, phone_number, otp_code):
        """Send OTP via SMS"""
        try:
            message = self.client.messages.create(
                body=f'Zeno Roadside Connect verification code: {otp_code}. Expires in 10 minutes.',
                from_='ZenoConnect',
                to=phone_number
            )
            
            return {
                'success': True,
                'message_sid': message.sid,
                'status': message.status,
                'sender_type': 'alphanumeric'
            }
            
        except Exception as e:
            logger.warning(f"SMS with alphanumeric failed, trying with phone number: {str(e)}")
            try:
                message = self.client.messages.create(
                    body=f'Zeno Roadside Connect verification code: {otp_code}. Expires in 10 minutes.',
                    from_=self.phone_number,
                    to=phone_number
                )
                
                return {
                    'success': True,
                    'message_sid': message.sid,
                    'status': message.status,
                    'sender_type': 'phone_number'
                }
                
            except Exception as sms_fallback_error:
                logger.error(f"SMS OTP completely failed for {phone_number}: {str(sms_fallback_error)}")
                return {
                    'success': False,
                    'error': str(sms_fallback_error),
                    'error_code': getattr(sms_fallback_error, 'code', 'Unknown')
                }

# Fallback OTP service for development
class DevelopmentOTPService:
    def send_otp(self, phone_number, otp, preferred_channel=None):
        print(f"🔐 DEV OTP for {phone_number}: {otp}")
        print(f"📱 Preferred channel: {preferred_channel}")
        print("📞 Channels that would be attempted based on preference")
        return {
            'success': True,
            'channel_used': preferred_channel or 'development',
            'preferred_channel': preferred_channel,
            'channels_attempted': [(preferred_channel or 'development', {'success': True})],
            'details': {'simulated': True}
        }

# Use appropriate service based on environment
def get_otp_service():
    if settings.DEBUG and not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN]):
        return DevelopmentOTPService()
    return MultiChannelOTPService()