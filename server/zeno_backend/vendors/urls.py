# vendors/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VendorViewSet, VendorReviewViewSet

router = DefaultRouter()
router.register(r'vendors', VendorViewSet)
router.register(r'reviews', VendorReviewViewSet)

urlpatterns = [
    path('', include(router.urls)),
]