# payments/urls.py
from django.urls import path, include
from .views import (
    initiate_payment, mpesa_callback, payment_status, retry_payment,
    vendor_payout_summary, zeno_revenue_report, bulk_process_payouts,
    generate_commission_summary,
    PaymentViewSet, PayoutRequestViewSet, CommissionSummaryViewSet, 
    PaymentWebhookLogViewSet
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'payout-requests', PayoutRequestViewSet, basename='payout-request')
router.register(r'commission-summaries', CommissionSummaryViewSet, basename='commission-summary')
router.register(r'webhook-logs', PaymentWebhookLogViewSet, basename='webhook-log')

urlpatterns = [
    path('', include(router.urls)),
    
    # Payment Processing
    path('initiate-payment/', initiate_payment, name='initiate-payment'),
    path('mpesa-callback/', mpesa_callback, name='mpesa-callback'),
    path('payment-status/<int:payment_id>/', payment_status, name='payment-status'),
    path('retry-payment/<int:payment_id>/', retry_payment, name='retry-payment'),
    
    # Analytics & Reporting (Admin Only)
    path('vendor-payout-summary/', vendor_payout_summary, name='vendor-payout-summary'),
    path('zeno-revenue-report/', zeno_revenue_report, name='zeno-revenue-report'),
    path('bulk-process-payouts/', bulk_process_payouts, name='bulk-process-payouts'),
    path('generate-commission-summary/', generate_commission_summary, name='generate-commission-summary'),
]