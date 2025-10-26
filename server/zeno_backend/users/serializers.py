# users/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import User
from .otp_service import get_otp_service
import phonenumbers
from phonenumbers import NumberParseException

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6)
    preferred_otp_channel = serializers.ChoiceField(
        choices=[('whatsapp', 'WhatsApp'), ('voice', 'Voice Call'), ('sms', 'SMS')],
        required=False,
        default='whatsapp',
        help_text="Preferred OTP delivery method: whatsapp, voice, or sms"
    )

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'password', 'password_confirm', 
                 'user_type', 'phone_number', 'location', 'first_name', 'last_name',
                 'preferred_otp_channel')
        extra_kwargs = {
            'phone_number': {'required': True},
            'username': {'required': False},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        # Validate phone number uniqueness
        phone_number = attrs.get('phone_number')
        if phone_number and User.objects.filter(phone_number=phone_number).exists():
            raise serializers.ValidationError({"phone_number": "A user with this phone number already exists."})
        
        # Email is optional now, but if provided, check uniqueness
        email = attrs.get('email')
        if email and User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        
        if not attrs.get('username') and phone_number:
            attrs['username'] = phone_number
        
        return attrs

    def create(self, validated_data):
        # Extract preferred channel before creating user
        preferred_channel = validated_data.pop('preferred_otp_channel', 'whatsapp')
        validated_data.pop('password_confirm')
        
        # Generate username from phone number if not provided
        if not validated_data.get('username'):
            validated_data['username'] = validated_data['phone_number']
        
        user = User.objects.create_user(
            email=validated_data.get('email', ''),
            username=validated_data['username'],
            password=validated_data['password'],
            user_type=validated_data.get('user_type', 'customer'),
            phone_number=validated_data.get('phone_number', ''),
            location=validated_data.get('location', ''),
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
        )
        
        # Store user's preferred OTP channel
        user.preferred_otp_channel = preferred_channel
        user.save()
        
        # Generate and send OTP using preferred channel
        #if user.phone_number:
            #otp = user.generate_otp()
            #otp_service = get_otp_service()
            #otp_service.send_otp(user.phone_number, otp, preferred_channel)

        return user

class UserLoginSerializer(serializers.Serializer):
    phone_number = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        phone_number = data.get('phone_number')
        password = data.get('password')
        
        if phone_number and password:
            try:
                user = User.objects.get(phone_number=phone_number)
                user = authenticate(username=user.username, password=password)
                if user:
                    if user.is_active:
                        data['user'] = user
                    else:
                        raise serializers.ValidationError('User account is disabled.')
                else:
                    raise serializers.ValidationError('Unable to login with provided credentials.')
            except User.DoesNotExist:
                raise serializers.ValidationError('Unable to login with provided credentials.')
        else:
            raise serializers.ValidationError('Must include phone number and password.')
        
        return data

class VerifyOTPSerializer(serializers.Serializer):
    otp = serializers.CharField(max_length=6, min_length=6)
    phone_number = serializers.CharField()

    def validate(self, data):
        try:
            user = User.objects.get(phone_number=data['phone_number'])
            if not user.verify_otp(data['otp']):
                raise serializers.ValidationError('Invalid or expired OTP.')
            data['user'] = user
        except User.DoesNotExist:
            raise serializers.ValidationError('User not found.')
        
        return data

class ResendOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField()
    preferred_channel = serializers.ChoiceField(
        choices=[('whatsapp', 'WhatsApp'), ('voice', 'Voice Call'), ('sms', 'SMS')],
        required=False,
        help_text="Optional: Override user's preferred OTP channel for this resend"
    )

    def validate(self, data):
        try:
            user = User.objects.get(phone_number=data['phone_number'])
            data['user'] = user
        except User.DoesNotExist:
            raise serializers.ValidationError('User not found.')
        
        return data

class UserProfileSerializer(serializers.ModelSerializer):
    preferred_otp_channel = serializers.CharField(source='get_preferred_otp_channel_display', read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'user_type', 'phone_number', 
                 'location', 'first_name', 'last_name', 'profile_picture', 
                 'is_verified', 'phone_verified', 'date_joined', 'preferred_otp_channel')
        read_only_fields = ('id', 'email', 'date_joined', 'preferred_otp_channel')

class UserUpdateSerializer(serializers.ModelSerializer):
    preferred_otp_channel = serializers.ChoiceField(
        choices=[('whatsapp', 'WhatsApp'), ('voice', 'Voice Call'), ('sms', 'SMS')],
        required=False
    )

    class Meta:
        model = User
        fields = ('username', 'first_name', 'last_name', 'phone_number', 'location', 'profile_picture', 'preferred_otp_channel')
        read_only_fields = ('email', 'user_type', 'is_verified', 'phone_verified', 'date_joined')

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password1 = serializers.CharField(required=True, min_length=6)
    new_password2 = serializers.CharField(required=True, min_length=6)

    def validate(self, data):
        if data['new_password1'] != data['new_password2']:
            raise serializers.ValidationError("New passwords don't match")
        return data

class ForgotPasswordSerializer(serializers.Serializer):
    phone_number = serializers.CharField(required=True)
    preferred_channel = serializers.ChoiceField(
        choices=[('whatsapp', 'WhatsApp'), ('voice', 'Voice Call'), ('sms', 'SMS')],
        required=False,
        help_text="Preferred OTP delivery method for password reset"
    )

class VerifyResetCodeSerializer(serializers.Serializer):
    phone_number = serializers.CharField(required=True)
    reset_code = serializers.CharField(required=True, min_length=6, max_length=6)

class ResetPasswordSerializer(serializers.Serializer):
    reset_token = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)
    confirm_password = serializers.CharField(required=True, min_length=6)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("Passwords don't match")
        return data