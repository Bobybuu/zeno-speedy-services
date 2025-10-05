# users/urls.py
from rest_framework_simplejwt.views import  TokenRefreshView

from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    UserProfileView,
    LogoutView,
    UserListView,
    UserDetailView,
    VerifyOTPView,
    ResendOTPView,
    CheckAuthView
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
    
    # Admin routes
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:user_id>/', UserDetailView.as_view(), name='user-detail'),
]