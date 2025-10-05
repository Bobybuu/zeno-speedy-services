# users/urls.py
from rest_framework_simplejwt.views import  TokenRefreshView

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
    VerifyResetCodeView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('resend-otp/', ResendOTPView.as_view(), name='resend-otp'),
    path('check-auth/', CheckAuthView.as_view(), name='check-auth'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),  # Django SimpleJWT
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('update-profile/', UpdateProfileView.as_view(), name='update-profile'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('verify-reset-code/', VerifyResetCodeView.as_view(), name='verify-reset-code'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    
    
    # Admin routes
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:user_id>/', UserDetailView.as_view(), name='user-detail'),
]