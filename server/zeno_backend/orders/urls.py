# orders/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, CartViewSet

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'cart', CartViewSet, basename='cart')

# Additional custom URL patterns for the new endpoints
urlpatterns = [
    path('', include(router.urls)),
    
    # Cart endpoints
    path('cart/my_cart/', CartViewSet.as_view({'get': 'my_cart'}), name='cart-my-cart'),
    path('cart/add_item/', CartViewSet.as_view({'post': 'add_item'}), name='cart-add-item'),
    path('cart/add_gas_product/', CartViewSet.as_view({'post': 'add_gas_product'}), name='cart-add-gas-product'),
    path('cart/update_quantity/', CartViewSet.as_view({'post': 'update_quantity'}), name='cart-update-quantity'),
    path('cart/remove_item/', CartViewSet.as_view({'post': 'remove_item'}), name='cart-remove-item'),
    path('cart/clear/', CartViewSet.as_view({'post': 'clear'}), name='cart-clear'),
    
    # Order management endpoints
    path('orders/vendor/orders/', OrderViewSet.as_view({'get': 'vendor_orders'}), name='vendor-orders'),
    path('orders/vendor/dashboard/', OrderViewSet.as_view({'get': 'vendor_dashboard_orders'}), name='vendor-dashboard-orders'),
    path('orders/vendor/gas_products/', OrderViewSet.as_view({'get': 'gas_product_orders'}), name='vendor-gas-product-orders'),
    path('orders/vendor/analytics/', OrderViewSet.as_view({'get': 'vendor_analytics'}), name='vendor-analytics'),
    path('orders/vendor/bulk_update_status/', OrderViewSet.as_view({'post': 'bulk_update_status'}), name='bulk-update-status'),
    
    # Individual order actions
    path('orders/<int:pk>/update_status/', OrderViewSet.as_view({'post': 'update_status'}), name='order-update-status'),
    path('orders/<int:pk>/update_priority/', OrderViewSet.as_view({'post': 'update_priority'}), name='order-update-priority'),
    path('orders/<int:pk>/update_completion_time/', OrderViewSet.as_view({'post': 'update_completion_time'}), name='order-update-completion-time'),
    path('orders/<int:pk>/cancel/', OrderViewSet.as_view({'post': 'cancel'}), name='order-cancel'),
    path('orders/<int:pk>/tracking/', OrderViewSet.as_view({'get': 'tracking'}), name='order-tracking'),
]

