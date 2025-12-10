# users/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import User
from vendors.models import Vendor, VendorPayoutPreference, VendorPerformance
from .otp_service import get_otp_service
import phonenumbers
from phonenumbers import NumberParseException

class VendorRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for vendor-specific registration data"""
    class Meta:
        model = Vendor
        fields = (
            'business_name', 'business_type', 'description', 'address', 
            'city', 'country', 'contact_number', 'email', 'website',
            'delivery_radius_km', 'min_order_amount', 'delivery_fee'
        )
        extra_kwargs = {
            'business_name': {'required': True},
            'business_type': {'required': True},
            'address': {'required': True},
            'city': {'required': True},
            'contact_number': {'required': True},
        }

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6)
    preferred_otp_channel = serializers.ChoiceField(
        choices=[('whatsapp', 'WhatsApp'), ('voice', 'Voice Call'), ('sms', 'SMS')],
        required=False,
        default='whatsapp',
        help_text="Preferred OTP delivery method: whatsapp, voice, or sms"
    )
    
    # Vendor-specific data (only required for vendor/mechanic registration)
    vendor_data = VendorRegistrationSerializer(required=False)

    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'password', 'password_confirm', 
                 'user_type', 'phone_number', 'location', 'first_name', 'last_name',
                 'preferred_otp_channel', 'vendor_data')
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
        
        # Validate vendor data for vendor/mechanic registration
        user_type = attrs.get('user_type')
        vendor_data = attrs.get('vendor_data')
        
        if user_type in ['vendor', 'mechanic'] and not vendor_data:
            raise serializers.ValidationError({
                "vendor_data": "Vendor business information is required for vendor/mechanic registration."
            })
        
        if user_type == 'customer' and vendor_data:
            raise serializers.ValidationError({
                "vendor_data": "Vendor data should not be provided for customer registration."
            })
        
        if not attrs.get('username') and phone_number:
            attrs['username'] = phone_number
        
        return attrs

    def create(self, validated_data):
        # Extract vendor data before creating user
        vendor_data = validated_data.pop('vendor_data', None)
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
        
        # Create vendor profile if user is vendor/mechanic
        if user.user_type in ['vendor', 'mechanic'] and vendor_data:
            self.create_vendor_profile(user, vendor_data)
        
        # Generate and send OTP using preferred channel
        # if user.phone_number:
        #     otp = user.generate_otp()
        #     otp_service = get_otp_service()
        #     otp_service.send_otp(user.phone_number, otp, preferred_channel)

        return user

    def create_vendor_profile(self, user, vendor_data):
        """Create vendor profile with the provided data"""
        try:
            # Map business types from frontend to backend
            business_type_mapping = {
                'gas_services': 'gas_station',
                'auto_repair': 'mechanic',
                'roadside_assistance': 'roadside_assistance',
                'tire_services': 'mechanic',
                'battery_services': 'mechanic',
                'general_mechanic': 'mechanic',
                'other': 'mechanic'
            }
            
            vendor_data['business_type'] = business_type_mapping.get(
                vendor_data.get('business_type', 'other'), 
                'mechanic'
            )
            
            # Use phone number as contact number if not provided
            if not vendor_data.get('contact_number'):
                vendor_data['contact_number'] = user.phone_number
            
            # Create vendor profile
            vendor = Vendor.objects.create(
                user=user,
                **vendor_data
            )
            
            # Vendor profile is automatically created with default payout preference
            # and performance records via the Vendor.save() method
            
            return vendor
            
        except Exception as e:
            # If vendor creation fails, delete the user to maintain data consistency
            user.delete()
            raise serializers.ValidationError({
                "vendor_data": f"Failed to create vendor profile: {str(e)}"
            })

class UserLoginSerializer(serializers.Serializer):
    phone_number = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        phone_number = data.get('phone_number')
        password = data.get('password')
        
        if phone_number and password:
            try:
                print(f"Attempting login with phone: {phone_number}")  # Debug
                
                # Try direct authentication first
                user = authenticate(username=phone_number, password=password)
                print(f"Direct auth result: {user}")  # Debug
                
                if user is None:
                    # Fallback: find by phone and authenticate with username
                    user_obj = User.objects.get(phone_number=phone_number)
                    print(f"Found user by phone: {user_obj.username}")  # Debug
                    user = authenticate(username=user_obj.username, password=password)
                    print(f"Username auth result: {user}")  # Debug
                
                if user:
                    if user.is_active:
                        data['user'] = user
                    else:
                        raise serializers.ValidationError('User account is disabled.')
                else:
                    raise serializers.ValidationError('Unable to login with provided credentials.')
                    
            except User.DoesNotExist:
                print(f"No user found with phone: {phone_number}")  # Debug
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
    has_vendor_profile = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'email', 'username', 'user_type', 'phone_number', 
                 'location', 'first_name', 'last_name', 'profile_picture', 
                 'is_verified', 'phone_verified', 'date_joined', 'preferred_otp_channel',
                 'has_vendor_profile')
        read_only_fields = ('id', 'email', 'date_joined', 'preferred_otp_channel', 'has_vendor_profile')

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