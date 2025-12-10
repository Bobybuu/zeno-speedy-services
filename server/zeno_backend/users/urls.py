# users/urls.py
from rest_framework_simplejwt.views import TokenRefreshView
from django.urls import path
from .views import (
    ChangePasswordView,
    ForgotPasswordView,
    RegisterView,
    LoginView,
    ResetPasswordView,
    UpdateProfileView,
    UserProfileView,
    LogoutView,
    UserListView,
    UserDetailView,
    VerifyOTPView,
    ResendOTPView,
    CheckAuthView,
    VerifyResetCodeView,
    UpdateOTPChannelView,  # Add this import
    health_check,
)

urlpatterns = [
    # Authentication endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('check-auth/', CheckAuthView.as_view(), name='check-auth'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    
    # OTP endpoints
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('update-otp-channel/', UpdateOTPChannelView.as_view(), name='update-otp-channel'),  # New endpoint
    
    # Profile management
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('update-profile/', UpdateProfileView.as_view(), name='update-profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    # Password reset endpoints
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('verify-reset-code/', VerifyResetCodeView.as_view(), name='verify-reset-code'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    
    # Health check
    path('health-check/', health_check, name='health-check'),
    
    # Admin routes
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:user_id>/', UserDetailView.as_view(), name='user-detail'),
]