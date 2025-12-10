# users/views.py
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from .permissions import IsAdminOrSuperUser
from rest_framework import generics, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth import login
from django.conf import settings
import random
import string
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta
from .models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    UserProfileSerializer,
    UserUpdateSerializer,
    VerifyOTPSerializer,
    ForgotPasswordSerializer,
    ResendOTPSerializer,
    VerifyResetCodeSerializer,
    ResetPasswordSerializer,
    ChangePasswordSerializer
)
from .otp_service import get_otp_service
from .rate_limiter import otp_rate_limiter

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        # Check rate limit before processing registration
        phone_number = request.data.get('phone_number')
        if phone_number:
            is_limited, retry_after = otp_rate_limiter.is_rate_limited(phone_number)
            if is_limited:
                return Response({
                    'error': f'Too many OTP requests. Please try again in {retry_after} seconds.',
                    'retry_after': retry_after,
                    'remaining_attempts': 0
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Record OTP request for rate limiting
            if user.phone_number:
                otp_rate_limiter.record_request(user.phone_number)
                remaining_attempts = otp_rate_limiter.get_remaining_attempts(user.phone_number)
            
            refresh = RefreshToken.for_user(user)
            
            response_data = {
                'user': UserProfileSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'User registered successfully!',
                'requires_otp_verification': False,
                'remaining_otp_attempts': remaining_attempts if user.phone_number else None,
                'preferred_channel_used': user.preferred_otp_channel
            }
            
            # Add vendor-specific data to response if applicable
            if user.user_type in ['vendor', 'mechanic'] and user.has_vendor_profile():
                try:
                    from vendors.serializers import VendorSerializer
                    vendor_profile = user.get_vendor_profile()
                    response_data['vendor_profile'] = VendorSerializer(vendor_profile).data
                    response_data['redirectPath'] = '/vendor/dashboard'  # Vendor dashboard redirect
                    response_data['message'] = 'Vendor account created successfully! Setting up your dashboard...'
                except ImportError:
                    # Fallback if vendors serializers not available
                    response_data['redirectPath'] = '/vendor/dashboard'
                    response_data['message'] = 'Vendor account created successfully! Setting up your dashboard...'
            else:
                response_data['redirectPath'] = '/dashboard'  # Customer dashboard
                response_data['message'] = 'Account created successfully! Welcome to Zeno Services.'
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            response_data = {
                'user': UserProfileSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Login successful'
            }
            
            # Add vendor profile data if user is vendor/mechanic
            if user.user_type in ['vendor', 'mechanic'] and user.has_vendor_profile():
                try:
                    from vendors.serializers import VendorSerializer
                    vendor_profile = user.get_vendor_profile()
                    response_data['vendor_profile'] = VendorSerializer(vendor_profile).data
                    response_data['redirectPath'] = '/vendor/dashboard'
                except ImportError:
                    response_data['redirectPath'] = '/vendor/dashboard'
            else:
                response_data['redirectPath'] = '/dashboard'
            
            return Response(response_data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            response_data = {
                'user': UserProfileSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Phone number verified successfully'
            }
            
            # Add vendor profile data if user is vendor/mechanic
            if user.user_type in ['vendor', 'mechanic'] and user.has_vendor_profile():
                try:
                    from vendors.serializers import VendorSerializer
                    vendor_profile = user.get_vendor_profile()
                    response_data['vendor_profile'] = VendorSerializer(vendor_profile).data
                    response_data['redirectPath'] = '/vendor/dashboard'
                except ImportError:
                    response_data['redirectPath'] = '/vendor/dashboard'
            else:
                response_data['redirectPath'] = '/dashboard'
            
            return Response(response_data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ResendOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            preferred_channel = request.data.get('preferred_channel')
            
            # Use user's preferred channel if not overridden
            if not preferred_channel:
                preferred_channel = user.preferred_otp_channel
            
            # Check rate limit
            is_limited, retry_after = otp_rate_limiter.is_rate_limited(user.phone_number)
            if is_limited:
                return Response({
                    'error': f'Too many OTP requests. Please try again in {retry_after} seconds.',
                    'retry_after': retry_after,
                    'remaining_attempts': 0
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            otp = user.generate_otp()
            otp_service = get_otp_service()
            result = otp_service.send_otp(user.phone_number, otp, preferred_channel)
            
            if result['success']:
                # Record OTP request
                otp_rate_limiter.record_request(user.phone_number)
                remaining_attempts = otp_rate_limiter.get_remaining_attempts(user.phone_number)
                
                return Response({
                    'message': f'OTP sent successfully via {result["channel_used"]}',
                    'channel_used': result['channel_used'],
                    'preferred_channel': preferred_channel,
                    'remaining_attempts': remaining_attempts
                })
            else:
                return Response({
                    'error': 'Failed to send OTP via all channels. Please try again later.',
                    'channels_attempted': result['channels_attempted']
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone_number']
            preferred_channel = request.data.get('preferred_channel')
            
            # Check rate limit
            is_limited, retry_after = otp_rate_limiter.is_rate_limited(phone_number)
            if is_limited:
                return Response({
                    'error': f'Too many OTP requests. Please try again in {retry_after} seconds.',
                    'retry_after': retry_after,
                    'remaining_attempts': 0
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
            try:
                user = User.objects.get(phone_number=phone_number)
                
                # Use user's preferred channel if not overridden
                if not preferred_channel:
                    preferred_channel = user.preferred_otp_channel
                
                # Generate reset token
                reset_token = ''.join(random.choices(string.digits, k=6))
                user.otp = reset_token
                user.otp_created_at = timezone.now()
                user.save()
                
                # Send reset OTP
                otp_service = get_otp_service()
                result = otp_service.send_otp(user.phone_number, reset_token, preferred_channel)
                
                if result['success']:
                    # Record OTP request
                    otp_rate_limiter.record_request(user.phone_number)
                    remaining_attempts = otp_rate_limiter.get_remaining_attempts(user.phone_number)
                    
                    return Response({
                        'message': f'Password reset code sent via {result["channel_used"]}',
                        'phone_number': phone_number,
                        'channel_used': result['channel_used'],
                        'preferred_channel': preferred_channel,
                        'remaining_attempts': remaining_attempts
                    })
                else:
                    return Response({
                        'error': 'Failed to send reset code via all channels. Please try again later.',
                        'channels_attempted': result['channels_attempted']
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            except User.DoesNotExist:
                # Don't reveal if phone number exists or not for security
                # But still apply rate limiting to prevent phone number enumeration
                otp_rate_limiter.record_request(phone_number)
                
                return Response({
                    'message': 'If the phone number exists, a reset code has been sent'
                })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    def put(self, request):
        serializer = UserUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            
            # If OTP channel was updated, send confirmation
            if 'preferred_otp_channel' in request.data:
                return Response({
                    'user': UserProfileSerializer(user).data,
                    'message': f'Profile updated successfully. Your preferred OTP channel is now {user.get_preferred_otp_channel_display()}.'
                })
            
            return Response({
                'user': UserProfileSerializer(user).data,
                'message': 'Profile updated successfully'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CheckAuthView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Check if user is authenticated and return user data"""
        serializer = UserProfileSerializer(request.user)
        response_data = {
            'authenticated': True,
            'user': serializer.data
        }
        
        # Add vendor profile data if user is vendor/mechanic
        if request.user.user_type in ['vendor', 'mechanic'] and request.user.has_vendor_profile():
            try:
                from vendors.serializers import VendorSerializer
                vendor_profile = request.user.get_vendor_profile()
                response_data['vendor_profile'] = VendorSerializer(vendor_profile).data
            except ImportError:
                pass
        
        return Response(response_data)

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh_token')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            return Response({'message': 'Successfully logged out'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)

class UserListView(generics.ListCreateAPIView):
    """
    Admin or superuser view to list all users or create a new user.
    """
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAdminOrSuperUser]

    def post(self, request, *args, **kwargs):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    "message": "User created successfully",
                    "user": UserProfileSerializer(user).data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Admin or superuser view to retrieve, update, or delete a specific user.
    """
    queryset = User.objects.all()
    serializer_class = UserUpdateSerializer
    permission_classes = [IsAdminOrSuperUser]
    lookup_field = 'id'

    def get(self, request, *args, **kwargs):
        user = self.get_object()
        return Response(UserProfileSerializer(user).data)

    def put(self, request, *args, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "message": "User updated successfully",
                "user": UserProfileSerializer(user).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, *args, **kwargs):
        user = self.get_object()
        user.delete()
        return Response({"message": "User deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            old_password = serializer.validated_data['old_password']
            new_password = serializer.validated_data['new_password1']
            
            # Check old password
            if not user.check_password(old_password):
                return Response({
                    'error': 'Current password is incorrect'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Set new password
            user.set_password(new_password)
            user.save()
            
            # Update session auth hash to keep user logged in
            update_session_auth_hash(request, user)
            
            return Response({
                'message': 'Password changed successfully'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)

class UpdateProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def put(self, request):
        user = request.user
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'user': UserProfileSerializer(user).data,
                'message': 'Profile updated successfully'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EmailForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        
        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            
            # Generate reset token (6-digit code for simplicity)
            reset_token = ''.join(random.choices(string.digits, k=6))
            user.otp = reset_token
            user.otp_created_at = timezone.now()
            user.save()
            
            # Send reset email (in production, use email service)
            if settings.DEBUG:
                print(f"Password reset token for {email}: {reset_token}")
            else:
                send_mail(
                    'Password Reset Request - Zeno Roadside Connect',
                    f'Your password reset code is: {reset_token}. This code expires in 10 minutes.',
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
            
            return Response({
                'message': 'Password reset code sent to your email',
                'email': email
            })
            
        except User.DoesNotExist:
            # Don't reveal if email exists or not for security
            return Response({
                'message': 'If the email exists, a reset code has been sent'
            })

class VerifyResetCodeView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = VerifyResetCodeSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone_number']
            reset_code = serializer.validated_data['reset_code']
            
            try:
                user = User.objects.get(phone_number=phone_number)
                
                # Check if reset code is valid and not expired
                if (user.otp == reset_code and 
                    user.otp_created_at and 
                    timezone.now() - user.otp_created_at < timedelta(minutes=getattr(settings, 'OTP_EXPIRY_MINUTES', 10))):
                    
                    # Generate a verification token for the reset session
                    refresh = RefreshToken.for_user(user)
                    reset_token = str(refresh.access_token)
                    
                    return Response({
                        'message': 'Reset code verified successfully',
                        'reset_token': reset_token
                    })
                else:
                    return Response({'error': 'Invalid or expired reset code'}, 
                                  status=status.HTTP_400_BAD_REQUEST)
                    
            except User.DoesNotExist:
                return Response({'error': 'Invalid reset code'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            reset_token = serializer.validated_data['reset_token']
            new_password = serializer.validated_data['new_password']
            
            # Verify the reset token
            from rest_framework_simplejwt.tokens import AccessToken
            try:
                token = AccessToken(reset_token)
                user_id = token['user_id']
                user = User.objects.get(id=user_id)
                
                # Set new password
                user.set_password(new_password)
                user.otp = None  # Clear the reset code
                user.otp_created_at = None
                user.save()
                
                return Response({
                    'message': 'Password reset successfully'
                })
                
            except Exception as e:
                return Response({'error': 'Invalid or expired reset token'}, 
                              status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UpdateOTPChannelView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        preferred_channel = request.data.get('preferred_otp_channel')
        
        if not preferred_channel:
            return Response({'error': 'Preferred OTP channel is required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if preferred_channel not in ['whatsapp', 'voice', 'sms']:
            return Response({'error': 'Invalid OTP channel. Choose from: whatsapp, voice, sms'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        user.preferred_otp_channel = preferred_channel
        user.save()
        
        return Response({
            'message': f'Your preferred OTP channel has been updated to {user.get_preferred_otp_channel_display()}',
            'preferred_otp_channel': user.preferred_otp_channel,
            'preferred_otp_channel_display': user.get_preferred_otp_channel_display()
        })

@csrf_exempt
def health_check(request):
    return JsonResponse({
        "status": "healthy", 
        "service": "Zeno Roadside Connect API",
        "timestamp": timezone.now().isoformat()
    })