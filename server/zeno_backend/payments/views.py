# payments/views.py
import requests
import json
import base64
from datetime import datetime, timedelta
from django.conf import settings
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, Avg, Q
from django.shortcuts import get_object_or_404

from .models import Payment, MpesaConfiguration, PayoutRequest, CommissionSummary, PaymentWebhookLog
from orders.models import Order
from vendors.models import Vendor, VendorEarning, PayoutTransaction
from .serializers import (
    PaymentSerializer, PaymentDetailSerializer, InitiatePaymentSerializer, 
    MpesaCallbackSerializer, ProcessCommissionSerializer,
    PayoutRequestSerializer, PayoutRequestCreateSerializer, PayoutRequestUpdateSerializer,
    CommissionSummarySerializer, PaymentWebhookLogSerializer,
    VendorPayoutSummarySerializer, ZenoRevenueReportSerializer, BulkPayoutProcessingSerializer
)

# ========== PERMISSION CLASSES ==========

class IsAdminUser(permissions.BasePermission):
    """Custom permission to only allow admin users"""
    def has_permission(self, request, view):
        return request.user and request.user.is_staff

class IsVendorUser(permissions.BasePermission):
    """Custom permission to only allow vendor users"""
    def has_permission(self, request, view):
        return request.user and request.user.user_type in ['vendor', 'mechanic']

# ========== SERVICE CLASSES ==========

class MpesaService:
    def __init__(self):
        try:
            self.config = MpesaConfiguration.objects.get(is_active=True)
        except MpesaConfiguration.DoesNotExist:
            raise Exception("M-Pesa configuration not found")
    
    def get_access_token(self):
        """Get M-Pesa access token"""
        auth_url = f"https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        if self.config.environment == 'production':
            auth_url = f"https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        
        response = requests.get(
            auth_url,
            auth=(self.config.consumer_key, self.config.consumer_secret)
        )
        
        if response.status_code == 200:
            return response.json()['access_token']
        else:
            raise Exception(f"Failed to get access token: {response.text}")
    
    def initiate_stk_push(self, phone_number, amount, order_id):
        """Initiate STK push payment"""
        access_token = self.get_access_token()
        
        # Format phone number (remove + and any spaces)
        phone_number = phone_number.replace('+', '').replace(' ', '')
        if not phone_number.startswith('254'):
            if phone_number.startswith('0'):
                phone_number = '254' + phone_number[1:]
            else:
                phone_number = '254' + phone_number
        
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        password = base64.b64encode(
            f"{self.config.shortcode}{self.config.passkey}{timestamp}".encode()
        ).decode()
        
        payload = {
            "BusinessShortCode": self.config.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone_number,
            "PartyB": self.config.shortcode,
            "PhoneNumber": phone_number,
            "CallBackURL": self.config.callback_url,
            "AccountReference": f"ORDER{order_id}",
            "TransactionDesc": f"Payment for order #{order_id}"
        }
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        stk_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        if self.config.environment == 'production':
            stk_url = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        
        response = requests.post(stk_url, json=payload, headers=headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"STK push failed: {response.text}")
    
    def initiate_b2c_payment(self, phone_number, amount, payout_reference):
        """Initiate M-Pesa B2C payment for vendor payouts"""
        access_token = self.get_access_token()
        
        # Format phone number (remove + and any spaces)
        phone_number = phone_number.replace('+', '').replace(' ', '')
        if not phone_number.startswith('254'):
            if phone_number.startswith('0'):
                phone_number = '254' + phone_number[1:]
            else:
                phone_number = '254' + phone_number
        
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        
        payload = {
            "OriginatorConversationID": payout_reference,
            "InitiatorName": "testapi",  # TODO: Replace with your initiator name
            "SecurityCredential": "YOUR_SECURITY_CREDENTIAL",  # TODO: Add your security credential
            "CommandID": "BusinessPayment",
            "Amount": int(amount),
            "PartyA": self.config.shortcode,
            "PartyB": phone_number,
            "Remarks": f"Payout from Zeno - {payout_reference}",
            "QueueTimeOutURL": f"{self.config.callback_url}/b2c-timeout",
            "ResultURL": f"{self.config.callback_url}/b2c-result",
            "Occasion": f"Vendor Payout {payout_reference}"
        }
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        b2c_url = "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest"
        if self.config.environment == 'production':
            b2c_url = "https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest"
        
        try:
            response = requests.post(b2c_url, json=payload, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"B2C payment failed: {response.text}")
                
        except Exception as e:
            raise Exception(f"B2C API call failed: {str(e)}")

# ========== VIEWSETS ==========

class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['mpesa_receipt_number', 'transaction_id', 'order__id']
    ordering_fields = ['created_at', 'amount', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin users can see all payments
        if user.is_staff:
            return Payment.objects.all().select_related('order', 'order__vendor', 'vendor_earning')
        
        # Vendor users can see payments for their orders
        if user.user_type in ['vendor', 'mechanic'] and hasattr(user, 'vendor_profile'):
            return Payment.objects.filter(
                order__vendor=user.vendor_profile
            ).select_related('order', 'order__vendor', 'vendor_earning')
        
        # Regular users can only see their own payments
        return Payment.objects.filter(user=user).select_related('order', 'order__vendor', 'vendor_earning')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PaymentDetailSerializer
        return PaymentSerializer
    
    @action(detail=True, methods=['post'])
    def process_commission(self, request, pk=None):
        """Manually process commission for a payment"""
        payment = self.get_object()
        
        if payment.status != 'completed':
            return Response(
                {'error': 'Can only process commissions for completed payments'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ProcessCommissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update commission rate if provided
        commission_rate = serializer.validated_data.get('commission_rate')
        if commission_rate:
            payment.commission_rate = commission_rate
        
        # Recalculate commission
        payment.commission_amount = (payment.amount * payment.commission_rate) / 100
        payment.vendor_earnings = payment.amount - payment.commission_amount
        
        # Create vendor earning if not exists
        if not payment.vendor_earning:
            payment._create_vendor_earning()
        
        payment.save()
        
        return Response(PaymentDetailSerializer(payment).data)

class PayoutRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            return PayoutRequest.objects.all().select_related('vendor', 'processed_by')
        
        # Vendors can only see their own payout requests
        if user.user_type in ['vendor', 'mechanic'] and hasattr(user, 'vendor_profile'):
            return PayoutRequest.objects.filter(vendor=user.vendor_profile).select_related('vendor')
        
        return PayoutRequest.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return PayoutRequestCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PayoutRequestUpdateSerializer
        return PayoutRequestSerializer
    
    def get_permissions(self):
        if self.action in ['create']:
            return [permissions.IsAuthenticated(), IsVendorUser()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        # Automatically assign the vendor from the user's vendor profile
        vendor = get_object_or_404(Vendor, user=self.request.user)
        serializer.save(vendor=vendor)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a payout request (admin only)"""
        payout_request = self.get_object()
        
        if payout_request.status != 'pending':
            return Response(
                {'error': 'Can only approve pending payout requests'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        payout_request.status = 'approved'
        payout_request.processed_by = request.user
        payout_request.save()
        
        return Response(PayoutRequestSerializer(payout_request).data)
    
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process an approved payout request using M-Pesa B2C API"""
        payout_request = self.get_object()
        
        if payout_request.status != 'approved':
            return Response(
                {'error': 'Can only process approved payout requests'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not payout_request.can_be_processed:
            return Response(
                {'error': 'Vendor does not have sufficient balance for this payout'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Initialize M-Pesa service
            mpesa_service = MpesaService()
            
            # Generate unique reference
            payout_reference = f"ZENO_PAYOUT_{payout_request.id}_{int(timezone.now().timestamp())}"
            
            # Initiate M-Pesa B2C payment
            b2c_response = mpesa_service.initiate_b2c_payment(
                phone_number=payout_request.recipient_number,
                amount=payout_request.amount,
                payout_reference=payout_reference
            )
            
            # Update payout request status
            payout_request.status = 'processing'
            payout_request.save()
            
            # Create payout transaction record
            payout_transaction = PayoutTransaction.objects.create(
                vendor=payout_request.vendor,
                payout_method='mpesa',
                payout_reference=payout_reference,
                amount=payout_request.amount,
                status='processing',
                recipient_details={
                    'phone_number': payout_request.recipient_number,
                    'recipient_name': payout_request.recipient_name
                },
                gateway_response=b2c_response
            )
            
            # Update vendor balance immediately (will be confirmed by webhook)
            vendor = payout_request.vendor
            vendor.available_balance -= payout_request.amount
            vendor.pending_payouts += payout_request.amount
            vendor.save()
            
            return Response({
                'message': 'Payout processing initiated via M-Pesa B2C',
                'payout_reference': payout_reference,
                'transaction_id': b2c_response.get('ConversationID'),
                'payout_request': PayoutRequestSerializer(payout_request).data
            })
            
        except Exception as e:
            payout_request.status = 'failed'
            payout_request.save()
            
            # Log the error
            PaymentWebhookLog.objects.create(
                webhook_type='mpesa_b2c',
                payload={'error': str(e), 'payout_request_id': payout_request.id},
                processed_successfully=False,
                error_message=f"B2C payout failed: {str(e)}",
                payout_transaction=None
            )
            
            return Response(
                {'error': f'Failed to process payout: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

class CommissionSummaryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for commission summaries (admin only)"""
    serializer_class = CommissionSummarySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['period_start', 'total_commission_earned']
    ordering = ['-period_start']
    
    def get_queryset(self):
        return CommissionSummary.objects.all()

class PaymentWebhookLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for payment webhook logs (admin only)"""
    serializer_class = PaymentWebhookLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['webhook_type', 'error_message']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return PaymentWebhookLog.objects.all()

# ========== API VIEWS ==========

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def initiate_payment(request):
    """Initiate payment for an order"""
    serializer = InitiatePaymentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    order_id = serializer.validated_data['order_id']
    phone_number = serializer.validated_data['phone_number']
    payment_method = serializer.validated_data['payment_method']
    
    try:
        order = Order.objects.get(id=order_id, customer=request.user)
    except Order.DoesNotExist:
        return Response(
            {'error': 'Order not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if payment already exists
    if hasattr(order, 'payment'):
        return Response(
            {'error': 'Payment already initiated for this order'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get commission rate from M-Pesa configuration
    try:
        mpesa_config = MpesaConfiguration.objects.get(is_active=True)
        commission_rate = mpesa_config.default_commission_rate
    except MpesaConfiguration.DoesNotExist:
        commission_rate = 10.00  # Default fallback
    
    # Create payment record with commission
    payment = Payment.objects.create(
        order=order,
        user=request.user,
        amount=order.total_amount,
        payment_method=payment_method,
        phone_number=phone_number,
        commission_rate=commission_rate
    )
    
    # Auto-calculate commission amounts
    payment.commission_amount = (payment.amount * payment.commission_rate) / 100
    payment.vendor_earnings = payment.amount - payment.commission_amount
    payment.save()
    
    # Process M-Pesa payment
    if payment_method == 'mpesa':
        try:
            mpesa_service = MpesaService()
            stk_response = mpesa_service.initiate_stk_push(
                phone_number, order.total_amount, order.id
            )
            
            # Update payment with STK response
            payment.transaction_id = stk_response.get('CheckoutRequestID')
            payment.status = 'processing'
            payment.save()
            
            return Response({
                'message': 'M-Pesa payment initiated successfully',
                'checkout_request_id': stk_response.get('CheckoutRequestID'),
                'payment_id': payment.id
            })
            
        except Exception as e:
            payment.status = 'failed'
            payment.save()
            return Response(
                {'error': f'Failed to initiate payment: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    return Response(PaymentSerializer(payment).data)

@api_view(['POST'])
@permission_classes([])  # No authentication required for M-Pesa callbacks
def mpesa_callback(request):
    """Handle M-Pesa callback for STK Push and B2C payments"""
    # Log the webhook call
    webhook_log = PaymentWebhookLog.objects.create(
        webhook_type='mpesa_callback',
        payload=request.data,
        headers=dict(request.headers)
    )
    
    try:
        # Determine callback type (STK Push or B2C)
        callback_data = request.data
        
        if 'Body' in callback_data and 'stkCallback' in callback_data['Body']:
            # STK Push callback
            return _handle_stk_callback(callback_data, webhook_log)
        elif 'Result' in callback_data:
            # B2C callback
            return _handle_b2c_callback(callback_data, webhook_log)
        else:
            webhook_log.processed_successfully = False
            webhook_log.error_message = "Unknown callback format"
            webhook_log.save()
            return Response({'error': 'Unknown callback format'}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        webhook_log.processed_successfully = False
        webhook_log.error_message = str(e)
        webhook_log.save()
        return Response(
            {'error': f'Error processing callback: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

def _handle_stk_callback(callback_data, webhook_log):
    """Handle STK Push callback"""
    serializer = MpesaCallbackSerializer(data=callback_data)
    serializer.is_valid(raise_exception=True)
    
    callback_data = serializer.validated_data['Body']['stkCallback']
    checkout_request_id = callback_data['CheckoutRequestID']
    result_code = callback_data['ResultCode']
    
    try:
        payment = Payment.objects.get(transaction_id=checkout_request_id)
    except Payment.DoesNotExist:
        webhook_log.processed_successfully = False
        webhook_log.error_message = f"Payment not found for checkout request: {checkout_request_id}"
        webhook_log.save()
        return Response({'error': 'Payment not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if result_code == 0:
        # Payment successful
        payment.status = 'completed'
        
        # Extract M-Pesa receipt number from callback metadata
        callback_metadata = callback_data.get('CallbackMetadata', {})
        items = callback_metadata.get('Item', [])
        for item in items:
            if item.get('Name') == 'MpesaReceiptNumber':
                payment.mpesa_receipt_number = item.get('Value', '')
                break
        
        payment.transaction_date = timezone.now()
        payment.payment_gateway_response = callback_data
        
        # Update order status
        payment.order.payment_status = 'paid'
        payment.order.save()
        
        # Auto-create vendor earning if configured
        mpesa_config = MpesaConfiguration.objects.get(is_active=True)
        if mpesa_config.auto_process_payouts:
            payment._create_vendor_earning()
            
            # Update vendor's available balance
            vendor = payment.order.vendor
            vendor.available_balance += payment.vendor_earnings
            vendor.total_earnings += payment.vendor_earnings
            vendor.save()
        
        webhook_log.processed_successfully = True
        webhook_log.payment = payment
        webhook_log.processing_notes = "STK Push payment completed successfully"
        
    else:
        # Payment failed
        payment.status = 'failed'
        payment.payment_gateway_response = callback_data
        webhook_log.processed_successfully = False
        webhook_log.error_message = f"STK Push payment failed with result code: {result_code}"
    
    payment.save()
    webhook_log.save()
    
    return Response({'message': 'STK Push callback processed successfully'})

def _handle_b2c_callback(callback_data, webhook_log):
    """Handle B2C payout callback"""
    result_data = callback_data.get('Result', {})
    result_type = result_data.get('ResultType', 0)
    result_code = result_data.get('ResultCode', 0)
    conversation_id = result_data.get('ConversationID', '')
    originator_conversation_id = result_data.get('OriginatorConversationID', '')
    
    try:
        # Find payout transaction by reference
        payout_transaction = PayoutTransaction.objects.get(
            payout_reference=originator_conversation_id
        )
        
        if result_code == 0:
            # B2C payment successful
            payout_transaction.status = 'completed'
            payout_transaction.completed_at = timezone.now()
            payout_transaction.gateway_response = callback_data
            
            # Update vendor balances
            vendor = payout_transaction.vendor
            vendor.pending_payouts -= payout_transaction.amount
            vendor.total_paid_out += payout_transaction.amount
            vendor.save()
            
            # Update related payout request
            payout_request = PayoutRequest.objects.filter(
                vendor=vendor,
                amount=payout_transaction.amount,
                status='processing'
            ).first()
            
            if payout_request:
                payout_request.status = 'completed'
                payout_request.completed_at = timezone.now()
                payout_request.save()
            
            webhook_log.processed_successfully = True
            webhook_log.payout_transaction = payout_transaction
            webhook_log.processing_notes = "B2C payout completed successfully"
            
        else:
            # B2C payment failed
            payout_transaction.status = 'failed'
            payout_transaction.gateway_response = callback_data
            
            # Revert vendor balances
            vendor = payout_transaction.vendor
            vendor.available_balance += payout_transaction.amount
            vendor.pending_payouts -= payout_transaction.amount
            vendor.save()
            
            webhook_log.processed_successfully = False
            webhook_log.error_message = f"B2C payout failed with result code: {result_code}"
        
        payout_transaction.save()
        webhook_log.save()
        
        return Response({'message': 'B2C callback processed successfully'})
        
    except PayoutTransaction.DoesNotExist:
        webhook_log.processed_successfully = False
        webhook_log.error_message = f"Payout transaction not found for reference: {originator_conversation_id}"
        webhook_log.save()
        return Response({'error': 'Payout transaction not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def payment_status(request, payment_id):
    """Check payment status"""
    try:
        payment = Payment.objects.get(id=payment_id)
        
        # Check permissions
        user = request.user
        if not user.is_staff and payment.user != user and (
            not hasattr(user, 'vendor_profile') or payment.order.vendor != user.vendor_profile
        ):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = PaymentDetailSerializer(payment)
        return Response(serializer.data)
    except Payment.DoesNotExist:
        return Response(
            {'error': 'Payment not found'},
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def retry_payment(request, payment_id):
    """Retry a failed payment"""
    try:
        payment = Payment.objects.get(id=payment_id, user=request.user)
        
        if payment.status != 'failed':
            return Response(
                {'error': 'Can only retry failed payments'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Reset payment status and retry
        payment.status = 'pending'
        payment.transaction_id = ''
        payment.mpesa_receipt_number = ''
        payment.save()
        
        # Re-initiate payment
        return initiate_payment(request._request)
        
    except Payment.DoesNotExist:
        return Response(
            {'error': 'Payment not found'},
            status=status.HTTP_404_NOT_FOUND
        )

# ========== ANALYTICS AND REPORTING VIEWS ==========

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
def vendor_payout_summary(request):
    """Get summary of vendor payouts (admin only)"""
    vendors = Vendor.objects.filter(is_active=True).select_related('payout_preference')
    
    summary_data = []
    for vendor in vendors:
        last_payout = vendor.payouts.filter(status='completed').order_by('-completed_at').first()
        
        summary_data.append({
            'vendor_id': vendor.id,
            'vendor_name': vendor.business_name,
            'total_earnings': float(vendor.total_earnings),
            'available_balance': float(vendor.available_balance),
            'pending_payouts': float(vendor.pending_payouts),
            'total_paid_out': float(vendor.total_paid_out),
            'payout_method': vendor.payout_preference.payout_method if hasattr(vendor, 'payout_preference') else None,
            'last_payout_date': last_payout.completed_at if last_payout else None
        })
    
    serializer = VendorPayoutSummarySerializer(summary_data, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
def zeno_revenue_report(request):
    """Generate Zeno revenue report (admin only)"""
    # Get date range from query parameters
    days = int(request.query_params.get('days', 30))
    end_date = timezone.now()
    start_date = end_date - timedelta(days=days)
    
    # Calculate revenue metrics
    payments = Payment.objects.filter(
        status='completed',
        created_at__range=[start_date, end_date]
    )
    
    total_revenue = payments.aggregate(total=Sum('amount'))['total'] or 0
    total_commissions = payments.aggregate(total=Sum('commission_amount'))['total'] or 0
    total_payouts = payments.aggregate(total=Sum('vendor_earnings'))['total'] or 0
    
    # Vendor and order metrics
    active_vendors = Vendor.objects.filter(is_active=True).count()
    completed_orders = Order.objects.filter(
        status='completed',
        created_at__range=[start_date, end_date]
    ).count()
    
    # Calculate average commission rate
    avg_commission_rate = payments.aggregate(avg=Avg('commission_rate'))['avg'] or 0
    
    report_data = {
        'period_start': start_date.date(),
        'period_end': end_date.date(),
        'total_revenue': float(total_revenue),
        'total_commissions': float(total_commissions),
        'total_payouts': float(total_payouts),
        'net_profit': float(total_commissions),  # For now, net profit = total commissions
        'active_vendors': active_vendors,
        'completed_orders': completed_orders,
        'average_commission_rate': float(avg_commission_rate)
    }
    
    serializer = ZenoRevenueReportSerializer(report_data)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
def bulk_process_payouts(request):
    """Bulk process approved payout requests using M-Pesa B2C API"""
    serializer = BulkPayoutProcessingSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    payout_request_ids = serializer.validated_data['payout_request_ids']
    processing_notes = serializer.validated_data.get('processing_notes', '')
    
    payout_requests = PayoutRequest.objects.filter(id__in=payout_request_ids, status='approved')
    
    results = {
        'successful': [],
        'failed': []
    }
    
    mpesa_service = MpesaService()
    
    for payout_request in payout_requests:
        try:
            if not payout_request.can_be_processed:
                results['failed'].append({
                    'id': payout_request.id,
                    'error': 'Insufficient vendor balance'
                })
                continue
            
            # Generate unique reference
            payout_reference = f"ZENO_BULK_{payout_request.id}_{int(timezone.now().timestamp())}"
            
            # Initiate M-Pesa B2C payment
            b2c_response = mpesa_service.initiate_b2c_payment(
                phone_number=payout_request.recipient_number,
                amount=payout_request.amount,
                payout_reference=payout_reference
            )
            
            # Update payout request status
            payout_request.status = 'processing'
            payout_request.save()
            
            # Create payout transaction record
            payout_transaction = PayoutTransaction.objects.create(
                vendor=payout_request.vendor,
                payout_method='mpesa',
                payout_reference=payout_reference,
                amount=payout_request.amount,
                status='processing',
                recipient_details={
                    'phone_number': payout_request.recipient_number,
                    'recipient_name': payout_request.recipient_name
                },
                gateway_response=b2c_response
            )
            
            # Update vendor balance immediately
            vendor = payout_request.vendor
            vendor.available_balance -= payout_request.amount
            vendor.pending_payouts += payout_request.amount
            vendor.save()
            
            results['successful'].append({
                'id': payout_request.id,
                'amount': float(payout_request.amount),
                'vendor': payout_request.vendor.business_name,
                'payout_reference': payout_reference,
                'transaction_id': b2c_response.get('ConversationID')
            })
            
        except Exception as e:
            results['failed'].append({
                'id': payout_request.id,
                'error': str(e)
            })
    
    return Response({
        'message': f"Initiated {len(results['successful'])} B2C payouts, {len(results['failed'])} failed",
        'results': results
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
def generate_commission_summary(request):
    """Generate commission summary for a period (admin only)"""
    period_type = request.data.get('period_type', 'monthly')
    
    end_date = timezone.now()
    if period_type == 'daily':
        start_date = end_date - timedelta(days=1)
    elif period_type == 'weekly':
        start_date = end_date - timedelta(weeks=1)
    elif period_type == 'monthly':
        start_date = end_date - timedelta(days=30)
    else:  # yearly
        start_date = end_date - timedelta(days=365)
    
    # Calculate commission summary
    payments = Payment.objects.filter(
        status='completed',
        created_at__range=[start_date, end_date]
    )
    
    total_payments = payments.count()
    total_payment_amount = payments.aggregate(total=Sum('amount'))['total'] or 0
    total_commission_earned = payments.aggregate(total=Sum('commission_amount'))['total'] or 0
    total_vendor_payouts = payments.aggregate(total=Sum('vendor_earnings'))['total'] or 0
    
    # Vendor statistics
    active_vendors = Vendor.objects.filter(is_active=True).count()
    vendors_with_payouts = Vendor.objects.filter(
        earnings__status='paid',
        earnings__created_at__range=[start_date, end_date]
    ).distinct().count()
    
    # Create commission summary
    commission_summary = CommissionSummary.objects.create(
        period_type=period_type,
        period_start=start_date.date(),
        period_end=end_date.date(),
        total_payments=total_payments,
        total_payment_amount=total_payment_amount,
        total_commission_earned=total_commission_earned,
        total_vendor_payouts=total_vendor_payouts,
        active_vendors=active_vendors,
        vendors_with_payouts=vendors_with_payouts
    )
    
    serializer = CommissionSummarySerializer(commission_summary)
    return Response(serializer.data)