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
from .serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    UserProfileSerializer,
    UserUpdateSerializer,
    VerifyOTPSerializer,
    ForgotPasswordSerializer,
    ResendOTPSerializer
)
from .otp_service import get_otp_service

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserProfileSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'User registered successfully. Please verify your phone number with the OTP sent.',
                'requires_otp_verification': bool(user.phone_number)
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# users/views.py - Update these views
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserProfileSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Login successful'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'user': UserProfileSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Phone number verified successfully'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ResendOTPView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            otp = user.generate_otp()
            otp_service = get_otp_service()
            success = otp_service.send_otp(user.phone_number, otp)
            
            if success:
                return Response({
                    'message': 'OTP sent successfully to your phone number'
                })
            else:
                return Response({
                    'error': 'Failed to send OTP. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Update Forgot Password views to use phone number
class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            phone_number = serializer.validated_data['phone_number']
            
            try:
                user = User.objects.get(phone_number=phone_number)
                
                # Generate reset token
                reset_token = ''.join(random.choices(string.digits, k=6))
                user.otp = reset_token
                user.otp_created_at = timezone.now()
                user.save()
                
                # Send reset SMS
                otp_service = get_otp_service()
                success = otp_service.send_otp(user.phone_number, reset_token)
                
                if success:
                    return Response({
                        'message': 'Password reset code sent to your phone',
                        'phone_number': phone_number
                    })
                else:
                    return Response({
                        'error': 'Failed to send reset code. Please try again.'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
            except User.DoesNotExist:
                # Don't reveal if phone number exists or not for security
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
            serializer.save()
            return Response({
                'user': UserProfileSerializer(request.user).data,
                'message': 'Profile updated successfully'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CheckAuthView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Check if user is authenticated and return user data"""
        serializer = UserProfileSerializer(request.user)
        return Response({
            'authenticated': True,
            'user': serializer.data
        })

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
        
        
class UserListView(generics.ListAPIView):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAdminUser]

class UserDetailView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'id'
    
    
    
    
class UserListView(generics.ListCreateAPIView):
    """
    Admin or superuser view to list all users or create a new user.
    """
    queryset = User.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAdminOrSuperUser]

    def post(self, request, *args, **kwargs):
        serializer = UserUpdateSerializer(data=request.data)
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
        user = request.user
        form = PasswordChangeForm(user, request.data)
        
        if form.is_valid():
            user = form.save()
            # Update session auth hash to keep user logged in
            update_session_auth_hash(request, user)
            return Response({
                'message': 'Password changed successfully'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'errors': form.errors
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
    
    
class ForgotPasswordView(APIView):
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
                    'Password Reset Request - Zeno Services',
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
        email = request.data.get('email')
        reset_code = request.data.get('reset_code')
        
        if not email or not reset_code:
            return Response({'error': 'Email and reset code are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            
            # Check if reset code is valid and not expired
            if (user.otp == reset_code and 
                user.otp_created_at and 
                timezone.now() - user.otp_created_at < timedelta(minutes=10)):
                
                # Generate a verification token for the reset session
                from rest_framework_simplejwt.tokens import RefreshToken
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

class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        reset_token = request.data.get('reset_token')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        if not reset_token or not new_password:
            return Response({'error': 'Reset token and new password are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if new_password != confirm_password:
            return Response({'error': 'Passwords do not match'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
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
    
    
