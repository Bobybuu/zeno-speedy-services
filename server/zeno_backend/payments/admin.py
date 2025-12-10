# payments/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum, Count, Avg
from .models import Payment, MpesaConfiguration, PayoutRequest, CommissionSummary, PaymentWebhookLog
from django.utils import timezone

# ========== INLINE ADMIN CLASSES ==========

class PaymentWebhookLogInline(admin.TabularInline):
    model = PaymentWebhookLog
    extra = 0
    fields = ['webhook_type', 'processed_successfully', 'error_message', 'created_at']
    readonly_fields = ['created_at']
    classes = ['collapse']
    can_delete = False

# ========== MAIN ADMIN CLASSES ==========

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'order_display', 'amount_display', 'payment_method', 'status', 
        'commission_display', 'vendor_earnings_display', 'payout_status', 
        'created_date'
    ]
    list_filter = [
        'status', 'payment_method', 'payout_status', 'created_at'
    ]
    search_fields = [
        'order__id', 'mpesa_receipt_number', 'phone_number', 
        'transaction_id', 'order__vendor__business_name'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'transaction_date', 
        'is_commission_calculated', 'vendor_payout_ready',
        'commission_summary', 'payment_details'
    ]
    list_select_related = ['order', 'order__vendor', 'vendor_earning']
    
    fieldsets = (
        ('Payment Information', {
            'fields': (
                'order', 'user', 'amount', 'currency', 'payment_method', 'status'
            )
        }),
        ('Commission & Payout', {
            'fields': (
                'commission_rate', 'commission_amount', 'vendor_earnings',
                'payout_status', 'vendor_earning', 'commission_summary'
            )
        }),
        ('M-Pesa Details', {
            'fields': (
                'mpesa_receipt_number', 'phone_number', 'transaction_date',
                'transaction_id'
            ),
            'classes': ('collapse',)
        }),
        ('Technical Details', {
            'fields': (
                'payment_gateway_response', 'payment_details'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': (
                'created_at', 'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [PaymentWebhookLogInline]
    
    actions = [
        'mark_as_completed', 'mark_as_failed', 'process_commissions',
        'update_payout_status'
    ]

    def order_display(self, obj):
        return f"Order #{obj.order.id}" if obj.order else "No Order"
    order_display.short_description = 'Order'
    order_display.admin_order_field = 'order__id'

    def amount_display(self, obj):
        return f"KES {obj.amount:,.2f}"
    amount_display.short_description = 'Amount'
    amount_display.admin_order_field = 'amount'

    def commission_display(self, obj):
        return f"KES {obj.commission_amount:,.2f}"
    commission_display.short_description = 'Commission'
    commission_display.admin_order_field = 'commission_amount'

    def vendor_earnings_display(self, obj):
        return f"KES {obj.vendor_earnings:,.2f}"
    vendor_earnings_display.short_description = 'Vendor Earnings'
    vendor_earnings_display.admin_order_field = 'vendor_earnings'

    def created_date(self, obj):
        return obj.created_at.date()
    created_date.short_description = 'Created Date'
    created_date.admin_order_field = 'created_at'

    def commission_summary(self, obj):
        return format_html(
            """
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <strong>Commission Summary:</strong><br>
                Rate: {rate}%<br>
                Commission: KES {commission:,.2f}<br>
                Vendor Earnings: KES {vendor_earnings:,.2f}<br>
                Calculated: {calculated} | Payout Ready: {payout_ready}
            </div>
            """.format(
                rate=obj.commission_rate,
                commission=obj.commission_amount,
                vendor_earnings=obj.vendor_earnings,
                calculated="✓" if obj.is_commission_calculated else "✗",
                payout_ready="✓" if obj.vendor_payout_ready else "✗"
            )
        )
    commission_summary.short_description = 'Commission Summary'

    def payment_details(self, obj):
        return format_html(
            """
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <strong>Payment Details:</strong><br>
                Method: {method}<br>
                Status: {status}<br>
                Payout Status: {payout_status}<br>
                M-Pesa Receipt: {receipt}<br>
                Transaction ID: {transaction_id}
            </div>
            """.format(
                method=obj.get_payment_method_display(),
                status=obj.status,
                payout_status=obj.payout_status,
                receipt=obj.mpesa_receipt_number or "N/A",
                transaction_id=obj.transaction_id or "N/A"
            )
        )
    payment_details.short_description = 'Payment Details'

    def mark_as_completed(self, request, queryset):
        updated = queryset.update(status='completed')
        self.message_user(request, f'{updated} payments marked as completed.')
    mark_as_completed.short_description = "Mark selected payments as completed"

    def mark_as_failed(self, request, queryset):
        updated = queryset.update(status='failed')
        self.message_user(request, f'{updated} payments marked as failed.')
    mark_as_failed.short_description = "Mark selected payments as failed"

    def process_commissions(self, request, queryset):
        processed = 0
        for payment in queryset:
            if payment.status == 'completed' and not payment.vendor_earning:
                payment._create_vendor_earning()
                processed += 1
        self.message_user(request, f'Commissions processed for {processed} payments.')
    process_commissions.short_description = "Process commissions for selected payments"

    def update_payout_status(self, request, queryset):
        updated = queryset.update(payout_status='processed')
        self.message_user(request, f'Payout status updated for {updated} payments.')
    update_payout_status.short_description = "Mark selected payments as processed for payout"

    def has_add_permission(self, request):
        return False  # Payments should only be created through the API

@admin.register(MpesaConfiguration)
class MpesaConfigurationAdmin(admin.ModelAdmin):
    list_display = [
        'environment', 'shortcode', 'callback_url', 'default_commission_rate',
        'auto_process_payouts', 'is_active', 'created_date'
    ]
    list_editable = ['is_active', 'auto_process_payouts', 'default_commission_rate']
    readonly_fields = []  # ✅ FIXED: Empty since MpesaConfiguration doesn't have timestamp fields
    
    fieldsets = (
        ('API Configuration', {
            'fields': (
                'environment', 'consumer_key', 'consumer_secret',
                'shortcode', 'passkey', 'callback_url'
            )
        }),
        ('Commission Settings', {
            'fields': (
                'default_commission_rate', 'auto_process_payouts', 'payout_processing_fee'
            )
        }),
        ('Status', {
            'fields': (
                'is_active', 'configuration_summary'
            )
        }),
    )

    def created_date(self, obj):
        # Since MpesaConfiguration doesn't have created_at, we'll use a placeholder
        return "N/A"
    created_date.short_description = 'Created'
    
    def configuration_summary(self, obj):
        return format_html(
            """
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <strong>Configuration Summary:</strong><br>
                Environment: {environment}<br>
                Shortcode: {shortcode}<br>
                Default Commission: {commission}%<br>
                Auto Payouts: {auto_payouts}<br>
                Processing Fee: KES {fee:,.2f}
            </div>
            """.format(
                environment=obj.get_environment_display(),
                shortcode=obj.shortcode,
                commission=obj.default_commission_rate,
                auto_payouts="Enabled" if obj.auto_process_payouts else "Disabled",
                fee=obj.payout_processing_fee
            )
        )
    configuration_summary.short_description = 'Configuration Summary'

    def has_add_permission(self, request):
        # Only allow one active configuration
        if MpesaConfiguration.objects.filter(is_active=True).exists():
            return False
        return True

@admin.register(PayoutRequest)
class PayoutRequestAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'vendor_display', 'amount_display', 'payout_method', 
        'status_display', 'can_be_processed_display', 'created_date'
    ]
    list_filter = ['status', 'payout_method', 'created_at']
    search_fields = [
        'vendor__business_name', 'recipient_number', 'recipient_name'
    ]
    readonly_fields = [
        'created_at', 'updated_at', 'processed_at', 'completed_at',
        'can_be_processed', 'payout_details'
    ]
    list_select_related = ['vendor', 'processed_by']
    
    actions = [
        'approve_requests', 'mark_as_processing', 'mark_as_completed',
        'mark_as_rejected'
    ]

    def vendor_display(self, obj):
        return obj.vendor.business_name
    vendor_display.short_description = 'Vendor'
    vendor_display.admin_order_field = 'vendor__business_name'

    def amount_display(self, obj):
        return f"KES {obj.amount:,.2f}"
    amount_display.short_description = 'Amount'
    amount_display.admin_order_field = 'amount'

    def status_display(self, obj):
        color_map = {
            'pending': 'orange',
            'approved': 'blue',
            'processing': 'purple',
            'completed': 'green',
            'rejected': 'red',
            'failed': 'darkred'
        }
        color = color_map.get(obj.status, 'black')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_display.short_description = 'Status'

    def can_be_processed_display(self, obj):
        if obj.can_be_processed:
            return format_html('<span style="color: green;">✓ Ready</span>')
        return format_html('<span style="color: red;">✗ Not Ready</span>')
    can_be_processed_display.short_description = 'Process Ready'

    def created_date(self, obj):
        return obj.created_at.date()
    created_date.short_description = 'Created Date'
    created_date.admin_order_field = 'created_at'

    def payout_details(self, obj):
        return format_html(
            """
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <strong>Payout Details:</strong><br>
                Vendor: {vendor}<br>
                Amount: KES {amount:,.2f}<br>
                Method: {method}<br>
                Recipient: {recipient} ({number})<br>
                Can Be Processed: {can_process}
            </div>
            """.format(
                vendor=obj.vendor.business_name,
                amount=obj.amount,
                method=obj.get_payout_method_display(),
                recipient=obj.recipient_name,
                number=obj.recipient_number,
                can_process="Yes" if obj.can_be_processed else "No"
            )
        )
    payout_details.short_description = 'Payout Details'

    def approve_requests(self, request, queryset):
        updated = queryset.filter(status='pending').update(
            status='approved',
            processed_by=request.user
        )
        self.message_user(request, f'{updated} payout requests approved.')
    approve_requests.short_description = "Approve selected payout requests"

    def mark_as_processing(self, request, queryset):
        updated = queryset.filter(status='approved').update(status='processing')
        self.message_user(request, f'{updated} payout requests marked as processing.')
    mark_as_processing.short_description = "Mark selected as processing"

    def mark_as_completed(self, request, queryset):
        updated = queryset.filter(status='processing').update(
            status='completed',
            completed_at=timezone.now()
        )
        self.message_user(request, f'{updated} payout requests marked as completed.')
    mark_as_completed.short_description = "Mark selected as completed"

    def mark_as_rejected(self, request, queryset):
        updated = queryset.filter(status='pending').update(status='rejected')
        self.message_user(request, f'{updated} payout requests rejected.')
    mark_as_rejected.short_description = "Reject selected payout requests"

@admin.register(CommissionSummary)
class CommissionSummaryAdmin(admin.ModelAdmin):
    list_display = [
        'period_display', 'total_payments', 'total_payment_amount_display',
        'total_commission_earned_display', 'total_vendor_payouts_display',
        'average_commission_rate_display', 'created_date'
    ]
    list_filter = ['period_type', 'period_start']
    readonly_fields = [
        'created_at', 'updated_at', 'period_display', 'financial_summary',
        'performance_metrics'
    ]
    date_hierarchy = 'period_start'

    def period_display(self, obj):
        return f"{obj.get_period_type_display()} - {obj.period_start} to {obj.period_end}"
    period_display.short_description = 'Period'

    def total_payment_amount_display(self, obj):
        return f"KES {obj.total_payment_amount:,.2f}"
    total_payment_amount_display.short_description = 'Total Payments'
    total_payment_amount_display.admin_order_field = 'total_payment_amount'

    def total_commission_earned_display(self, obj):
        return f"KES {obj.total_commission_earned:,.2f}"
    total_commission_earned_display.short_description = 'Total Commission'
    total_commission_earned_display.admin_order_field = 'total_commission_earned'

    def total_vendor_payouts_display(self, obj):
        return f"KES {obj.total_vendor_payouts:,.2f}"
    total_vendor_payouts_display.short_description = 'Vendor Payouts'
    total_vendor_payouts_display.admin_order_field = 'total_vendor_payouts'

    def average_commission_rate_display(self, obj):
        return f"{obj.average_commission_rate:.2f}%"
    average_commission_rate_display.short_description = 'Avg Commission Rate'
    average_commission_rate_display.admin_order_field = 'average_commission_rate'

    def created_date(self, obj):
        return obj.created_at.date()
    created_date.short_description = 'Created Date'
    created_date.admin_order_field = 'created_at'

    def financial_summary(self, obj):
        return format_html(
            """
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <strong>Financial Summary:</strong><br>
                Total Payments: KES {total_payments:,.2f}<br>
                Total Commission: KES {total_commission:,.2f}<br>
                Vendor Payouts: KES {vendor_payouts:,.2f}<br>
                Net Revenue: KES {net_revenue:,.2f}
            </div>
            """.format(
                total_payments=obj.total_payment_amount,
                total_commission=obj.total_commission_earned,
                vendor_payouts=obj.total_vendor_payouts,
                net_revenue=obj.total_commission_earned
            )
        )
    financial_summary.short_description = 'Financial Summary'

    def performance_metrics(self, obj):
        return format_html(
            """
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <strong>Performance Metrics:</strong><br>
                Total Payments: {total_payments}<br>
                Active Vendors: {active_vendors}<br>
                Vendors with Payouts: {vendors_with_payouts}<br>
                Average Commission Rate: {avg_rate:.2f}%<br>
                Commission to Revenue Ratio: {ratio:.2f}%
            </div>
            """.format(
                total_payments=obj.total_payments,
                active_vendors=obj.active_vendors,
                vendors_with_payouts=obj.vendors_with_payouts,
                avg_rate=obj.average_commission_rate,
                ratio=obj.commission_to_revenue_ratio
            )
        )
    performance_metrics.short_description = 'Performance Metrics'

@admin.register(PaymentWebhookLog)
class PaymentWebhookLogAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'webhook_type_display', 'processed_successfully_display',
        'payment_display', 'created_time'
    ]
    list_filter = ['webhook_type', 'processed_successfully', 'created_at']
    search_fields = ['error_message', 'payment__order__id']
    readonly_fields = ['created_at', 'webhook_details']
    list_select_related = ['payment', 'payout_transaction']

    def webhook_type_display(self, obj):
        return obj.get_webhook_type_display()
    webhook_type_display.short_description = 'Webhook Type'

    def processed_successfully_display(self, obj):
        if obj.processed_successfully:
            return format_html('<span style="color: green;">✓ Success</span>')
        return format_html('<span style="color: red;">✗ Failed</span>')
    processed_successfully_display.short_description = 'Status'

    def payment_display(self, obj):
        if obj.payment:
            return f"Payment #{obj.payment.id}"
        elif obj.payout_transaction:
            return f"Payout #{obj.payout_transaction.id}"
        return "N/A"
    payment_display.short_description = 'Related Object'

    def created_time(self, obj):
        return obj.created_at.strftime("%Y-%m-%d %H:%M:%S")
    created_time.short_description = 'Created Time'
    created_time.admin_order_field = 'created_at'

    def webhook_details(self, obj):
        return format_html(
            """
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <strong>Webhook Details:</strong><br>
                Type: {type}<br>
                Processed: {processed}<br>
                Error: {error}<br>
                Notes: {notes}
            </div>
            """.format(
                type=obj.get_webhook_type_display(),
                processed="Yes" if obj.processed_successfully else "No",
                error=obj.error_message or "None",
                notes=obj.processing_notes or "None"
            )
        )
    webhook_details.short_description = 'Webhook Details'

    def has_add_permission(self, request):
        return False  # Webhook logs should only be created through the API