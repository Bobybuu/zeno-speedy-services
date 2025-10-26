# vendors/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router and register our viewsets
router = DefaultRouter()
router.register(r'vendors', views.VendorViewSet, basename='vendor')
router.register(r'reviews', views.VendorReviewViewSet, basename='vendor-review')
router.register(r'gas-products', views.GasProductViewSet, basename='gas-product')
router.register(r'product-images', views.GasProductImageViewSet, basename='product-image')
router.register(r'operating-hours', views.OperatingHoursViewSet, basename='operating-hours')

# ========== NEW DASHBOARD VIEWSETS ==========
router.register(r'payout-preferences', views.VendorPayoutPreferenceViewSet, basename='payout-preference')
router.register(r'vendor-earnings', views.VendorEarningViewSet, basename='vendor-earning')
router.register(r'payout-transactions', views.PayoutTransactionViewSet, basename='payout-transaction')

# The URL patterns are now determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
    
    # ========== ADDITIONAL CUSTOM ENDPOINTS ==========
    path('debug/gas-products/', views.debug_gas_products, name='debug-gas-products'),
]