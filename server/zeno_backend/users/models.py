# users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import random
import string

class User(AbstractUser):
    USER_TYPES = (
        ('customer', 'Customer'),
        ('vendor', 'Vendor'),
        ('mechanic', 'Mechanic'),
        ('admin', 'Admin'),
    )
    
    OTP_CHOICES = [
        ('whatsapp', 'WhatsApp'),
        ('voice', 'Voice Call'),
        ('sms', 'SMS'),
    ]
    
    user_type = models.CharField(max_length=20, choices=USER_TYPES, default='customer')
    phone_number = models.CharField(max_length=15, blank=True)
    location = models.CharField(max_length=255, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    phone_verified = models.BooleanField(default=False)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(null=True, blank=True)
    preferred_otp_channel = models.CharField(
        max_length=10,
        choices=OTP_CHOICES,
        default='whatsapp',
        help_text="Preferred method for receiving OTP codes"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.email} ({self.user_type})"

    def generate_otp(self):
        """Generate a 6-digit OTP"""
        otp = ''.join(random.choices(string.digits, k=6))
        self.otp = otp
        self.otp_created_at = timezone.now()
        self.save()
        return otp

    def verify_otp(self, otp):
        """Verify OTP and mark phone as verified if successful"""
        from django.utils import timezone
        from datetime import timedelta
        from django.conf import settings
        
        if (self.otp == otp and 
            self.otp_created_at and 
            timezone.now() - self.otp_created_at < timedelta(minutes=getattr(settings, 'OTP_EXPIRY_MINUTES', 10))):
            self.phone_verified = True
            self.otp = None
            self.otp_created_at = None
            self.save()
            return True
        return False

    def get_preferred_otp_channel_display(self):
        """Get human-readable preferred OTP channel"""
        return dict(self.OTP_CHOICES).get(self.preferred_otp_channel, 'WhatsApp')

    class Meta:
        db_table = 'users'