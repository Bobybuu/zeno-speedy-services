# payments/serializers.py
from rest_framework import serializers
from .models import Payment, MpesaConfiguration, PayoutRequest, CommissionSummary, PaymentWebhookLog

class PaymentSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    service_name = serializers.CharField(source='order.service.name', read_only=True)
    vendor_name = serializers.CharField(source='order.vendor.business_name', read_only=True)
    vendor_id = serializers.IntegerField(source='order.vendor.id', read_only=True)
    
    # New commission fields
    is_commission_calculated = serializers.BooleanField(read_only=True)
    vendor_payout_ready = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'order_id', 'service_name', 'vendor_name', 'vendor_id',
            'amount', 'currency', 'payment_method', 'status',
            
            # Commission tracking
            'commission_rate', 'commission_amount', 'vendor_earnings',
            'payout_status', 'is_commission_calculated', 'vendor_payout_ready',
            
            # M-Pesa fields
            'mpesa_receipt_number', 'phone_number', 'transaction_date',
            
            # Generic payment fields
            'transaction_id', 'payment_gateway_response',
            
            # Timestamps
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'order', 'amount', 'currency', 'created_at', 'updated_at',
            'commission_rate', 'commission_amount', 'vendor_earnings',
            'is_commission_calculated', 'vendor_payout_ready'
        ]

class PaymentDetailSerializer(serializers.ModelSerializer):
    """Detailed payment serializer with vendor earning information"""
    order_details = serializers.SerializerMethodField()
    vendor_details = serializers.SerializerMethodField()
    vendor_earning_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = [
            'id', 'order_details', 'vendor_details', 'amount', 'currency',
            'payment_method', 'status', 'commission_rate', 'commission_amount',
            'vendor_earnings', 'payout_status', 'vendor_earning_details',
            'mpesa_receipt_number', 'phone_number', 'transaction_date',
            'transaction_id', 'created_at', 'updated_at'
        ]
        read_only_fields = ['__all__']
    
    def get_order_details(self, obj):
        from orders.serializers import OrderSerializer
        return OrderSerializer(obj.order).data if obj.order else None
    
    def get_vendor_details(self, obj):
        from vendors.serializers import VendorMinimalSerializer
        return VendorMinimalSerializer(obj.order.vendor).data if obj.order and obj.order.vendor else None
    
    def get_vendor_earning_details(self, obj):
        from vendors.serializers import VendorEarningSerializer
        return VendorEarningSerializer(obj.vendor_earning).data if obj.vendor_earning else None

class InitiatePaymentSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    phone_number = serializers.CharField(max_length=15)
    payment_method = serializers.ChoiceField(choices=Payment.PAYMENT_METHODS, default='mpesa')
    
    def validate_order_id(self, value):
        from orders.models import Order
        try:
            order = Order.objects.get(id=value)
            # Check if payment already exists for this order
            if hasattr(order, 'payment'):
                raise serializers.ValidationError("Payment already exists for this order")
        except Order.DoesNotExist:
            raise serializers.ValidationError("Order does not exist")
        return value

class ProcessCommissionSerializer(serializers.Serializer):
    """Serializer for manually processing commissions"""
    payment_id = serializers.IntegerField()
    commission_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2, 
        min_value=0, max_value=100,
        required=False,
        help_text="Override default commission rate (%)"
    )
    
    def validate_payment_id(self, value):
        try:
            payment = Payment.objects.get(id=value)
            if payment.status != 'completed':
                raise serializers.ValidationError("Can only process commissions for completed payments")
        except Payment.DoesNotExist:
            raise serializers.ValidationError("Payment does not exist")
        return value

class MpesaCallbackSerializer(serializers.Serializer):
    """Serializer for M-Pesa callback data"""
    Body = serializers.DictField()
    
    def validate(self, data):
        stk_callback = data.get('Body', {}).get('stkCallback', {})
        if not stk_callback:
            raise serializers.ValidationError("Invalid M-Pesa callback format")
        return data

class MpesaConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaConfiguration
        fields = [
            'id', 'environment', 'shortcode', 'callback_url', 'is_active',
            'default_commission_rate', 'auto_process_payouts', 'payout_processing_fee'
        ]
        read_only_fields = ['consumer_key', 'consumer_secret', 'passkey']

class PayoutRequestSerializer(serializers.ModelSerializer):
    """Serializer for vendor payout requests"""
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True)
    vendor_available_balance = serializers.DecimalField(
        source='vendor.available_balance', 
        read_only=True, 
        max_digits=12, 
        decimal_places=2
    )
    can_be_processed = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = PayoutRequest
        fields = [
            'id', 'vendor', 'vendor_name', 'amount', 'payout_method', 'status',
            'recipient_number', 'recipient_name', 'vendor_available_balance',
            'admin_notes', 'processed_by', 'can_be_processed',
            'created_at', 'updated_at', 'processed_at', 'completed_at'
        ]
        read_only_fields = [
            'vendor', 'status', 'processed_by', 'created_at', 'updated_at',
            'processed_at', 'completed_at', 'vendor_available_balance', 'can_be_processed'
        ]
    
    def validate_amount(self, value):
        """Validate payout amount against vendor's available balance"""
        if hasattr(self, 'initial_data') and 'vendor' in self.initial_data:
            from vendors.models import Vendor
            try:
                vendor = Vendor.objects.get(id=self.initial_data['vendor'])
                if value > vendor.available_balance:
                    raise serializers.ValidationError(
                        f"Payout amount exceeds available balance. Available: KES {vendor.available_balance:,.2f}"
                    )
            except Vendor.DoesNotExist:
                raise serializers.ValidationError("Vendor does not exist")
        
        if value <= 0:
            raise serializers.ValidationError("Payout amount must be greater than 0")
        
        return value

class PayoutRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating payout requests (vendor perspective)"""
    class Meta:
        model = PayoutRequest
        fields = [
            'amount', 'payout_method', 'recipient_number', 'recipient_name'
        ]
    
    def validate(self, data):
        # Ensure vendor has sufficient balance
        request = self.context.get('request')
        if request and hasattr(request.user, 'vendor_profile'):
            vendor = request.user.vendor_profile
            if data['amount'] > vendor.available_balance:
                raise serializers.ValidationError({
                    'amount': f"Insufficient balance. Available: KES {vendor.available_balance:,.2f}"
                })
        
        return data

class PayoutRequestUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating payout requests (admin perspective)"""
    class Meta:
        model = PayoutRequest
        fields = [
            'status', 'admin_notes'
        ]
    
    def validate_status(self, value):
        valid_transitions = {
            'pending': ['approved', 'rejected'],
            'approved': ['processing', 'rejected'],
            'processing': ['completed', 'failed'],
            'completed': [],
            'rejected': [],
            'failed': [],
        }
        
        current_status = self.instance.status
        if value not in valid_transitions.get(current_status, []):
            raise serializers.ValidationError(
                f"Cannot change status from {current_status} to {value}"
            )
        return value

class CommissionSummarySerializer(serializers.ModelSerializer):
    """Serializer for commission summary reports"""
    period_display = serializers.SerializerMethodField()
    
    class Meta:
        model = CommissionSummary
        fields = [
            'id', 'period_type', 'period_start', 'period_end', 'period_display',
            'total_payments', 'total_payment_amount', 'total_commission_earned',
            'total_vendor_payouts', 'active_vendors', 'vendors_with_payouts',
            'average_commission_rate', 'commission_to_revenue_ratio',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['__all__']
    
    def get_period_display(self, obj):
        return f"{obj.get_period_type_display()} - {obj.period_start} to {obj.period_end}"

class PaymentWebhookLogSerializer(serializers.ModelSerializer):
    """Serializer for payment webhook logs"""
    webhook_type_display = serializers.CharField(source='get_webhook_type_display', read_only=True)
    
    class Meta:
        model = PaymentWebhookLog
        fields = [
            'id', 'webhook_type', 'webhook_type_display', 'payload', 'headers',
            'processed_successfully', 'processing_notes', 'error_message',
            'payment', 'payout_transaction', 'created_at'
        ]
        read_only_fields = ['__all__']

class VendorPayoutSummarySerializer(serializers.Serializer):
    """Serializer for vendor payout summary"""
    vendor_id = serializers.IntegerField()
    vendor_name = serializers.CharField()
    total_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    available_balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_payouts = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_paid_out = serializers.DecimalField(max_digits=12, decimal_places=2)
    payout_method = serializers.CharField(allow_null=True)
    last_payout_date = serializers.DateTimeField(allow_null=True)

class ZenoRevenueReportSerializer(serializers.Serializer):
    """Serializer for Zeno revenue reports"""
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_commissions = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_payouts = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    active_vendors = serializers.IntegerField()
    completed_orders = serializers.IntegerField()
    average_commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2)

class BulkPayoutProcessingSerializer(serializers.Serializer):
    """Serializer for bulk payout processing"""
    payout_request_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )
    processing_notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_payout_request_ids(self, value):
        # Check if all payout requests exist and can be processed
        from .models import PayoutRequest
        valid_requests = PayoutRequest.objects.filter(
            id__in=value, 
            status='approved'
        ).values_list('id', flat=True)
        
        invalid_ids = set(value) - set(valid_requests)
        if invalid_ids:
            raise serializers.ValidationError(
                f"Payout requests with IDs {invalid_ids} are not approved or do not exist"
            )
        
        return value