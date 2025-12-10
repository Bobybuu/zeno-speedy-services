# vendors/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum, Count, Avg
from .models import (
    Vendor, GasProduct, GasProductImage, GasPriceHistory, 
    VendorReview, OperatingHours, VendorPayoutPreference, 
    VendorEarning, PayoutTransaction, VendorPerformance
)

# ========== INLINE ADMIN CLASSES ==========

class GasProductInline(admin.TabularInline):
    model = GasProduct
    extra = 0
    fields = ['name', 'gas_type', 'cylinder_size', 'price_with_cylinder', 'stock_quantity', 'is_available']
    readonly_fields = ['created_at']
    classes = ['collapse']

class VendorReviewInline(admin.TabularInline):
    model = VendorReview
    extra = 0
    fields = ['customer', 'rating', 'comment', 'created_at']
    readonly_fields = ['created_at']
    classes = ['collapse']

class OperatingHoursInline(admin.TabularInline):
    model = OperatingHours
    extra = 7  # One for each day
    max_num = 7
    classes = ['collapse']

class VendorEarningInline(admin.TabularInline):
    model = VendorEarning
    extra = 0
    fields = ['earning_type', 'gross_amount', 'commission_amount', 'net_amount', 'status', 'created_at']
    readonly_fields = ['created_at']
    classes = ['collapse']

class PayoutTransactionInline(admin.TabularInline):
    model = PayoutTransaction
    extra = 0
    fields = ['payout_reference', 'amount', 'status', 'initiated_at']
    readonly_fields = ['initiated_at']
    classes = ['collapse']

# ========== MAIN ADMIN CLASSES ==========

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = [
        'business_name', 'business_type', 'city', 'is_verified', 
        'is_active', 'total_gas_products', 'total_earnings_display',
        'available_balance_display', 'has_payout_preference_display'
    ]
    list_filter = [
        'business_type', 'city', 'is_verified', 'is_active',
        'created_at'
    ]
    search_fields = [
        'business_name', 'city', 'contact_number', 'email'
    ]
    readonly_fields = [
        'average_rating', 'total_reviews', 'created_at', 'updated_at',
        'total_earnings', 'available_balance', 'pending_payouts', 
        'total_paid_out', 'total_orders_count', 'completed_orders_count',
        'active_customers_count', 'financial_summary', 'performance_summary'
    ]
    fieldsets = (
        ('Business Information', {
            'fields': (
                'user', 'business_name', 'business_type', 'description',
                'is_verified', 'is_active'
            )
        }),
        ('Location Details', {
            'fields': (
                'latitude', 'longitude', 'address', 'city', 'country'
            )
        }),
        ('Contact Information', {
            'fields': (
                'contact_number', 'email', 'website', 'opening_hours'
            )
        }),
        ('Business Settings', {
            'fields': (
                'delivery_radius_km', 'min_order_amount', 'delivery_fee'
            )
        }),
        ('Financial Information', {
            'fields': (
                'commission_rate', 'financial_summary'
            )
        }),
        ('Performance Metrics', {
            'fields': (
                'average_rating', 'total_reviews', 'performance_summary'
            )
        }),
        ('Timestamps', {
            'fields': (
                'created_at', 'updated_at'
            ),
            'classes': ('collapse',)
        }),
        ('Dashboard Preferences', {
            'fields': (
                'dashboard_layout', 'notification_preferences'
            ),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [
        GasProductInline, 
        VendorReviewInline, 
        OperatingHoursInline,
        VendorEarningInline,
        PayoutTransactionInline
    ]
    
    actions = [
        'verify_vendors', 'deactivate_vendors', 'update_performance_metrics'
    ]

    def total_earnings_display(self, obj):
        return f"KES {obj.total_earnings:,.2f}"
    total_earnings_display.short_description = 'Total Earnings'
    total_earnings_display.admin_order_field = 'total_earnings'

    def available_balance_display(self, obj):
        return f"KES {obj.available_balance:,.2f}"
    available_balance_display.short_description = 'Available Balance'
    available_balance_display.admin_order_field = 'available_balance'

    def has_payout_preference_display(self, obj):
        if obj.has_payout_preference:
            return format_html('<span style="color: green;">✓ Configured</span>')
        return format_html('<span style="color: red;">✗ Not Configured</span>')
    has_payout_preference_display.short_description = 'Payout Setup'

    def financial_summary(self, obj):
        return format_html(
            """
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <strong>Financial Summary:</strong><br>
                Total Earnings: KES {total_earnings:,.2f}<br>
                Available Balance: KES {available_balance:,.2f}<br>
                Pending Payouts: KES {pending_payouts:,.2f}<br>
                Total Paid Out: KES {total_paid_out:,.2f}
            </div>
            """.format(
                total_earnings=obj.total_earnings,
                available_balance=obj.available_balance,
                pending_payouts=obj.pending_payouts,
                total_paid_out=obj.total_paid_out
            )
        )
    financial_summary.short_description = 'Financial Summary'

    def performance_summary(self, obj):
        return format_html(
            """
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <strong>Performance Summary:</strong><br>
                Total Orders: {total_orders}<br>
                Completed Orders: {completed_orders}<br>
                Active Customers: {active_customers}<br>
                Completion Rate: {completion_rate:.1f}%
            </div>
            """.format(
                total_orders=obj.total_orders_count,
                completed_orders=obj.completed_orders_count,
                active_customers=obj.active_customers_count,
                completion_rate=obj.order_completion_rate
            )
        )
    performance_summary.short_description = 'Performance Summary'

    def verify_vendors(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} vendors verified successfully.')
    verify_vendors.short_description = "Verify selected vendors"

    def deactivate_vendors(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} vendors deactivated.')
    deactivate_vendors.short_description = "Deactivate selected vendors"

    def update_performance_metrics(self, request, queryset):
        for vendor in queryset:
            vendor.update_performance_metrics()
        self.message_user(request, f'Performance metrics updated for {queryset.count()} vendors.')
    update_performance_metrics.short_description = "Update performance metrics"

@admin.register(VendorPayoutPreference)
class VendorPayoutPreferenceAdmin(admin.ModelAdmin):
    list_display = [
        'vendor', 'payout_method', 'payout_details_summary', 
        'is_verified', 'auto_payout', 'payout_threshold_display'
    ]
    list_filter = ['payout_method', 'is_verified', 'auto_payout']
    search_fields = [
        'vendor__business_name', 'mobile_money_number', 
        'account_number', 'bank_name'
    ]
    readonly_fields = ['created_at', 'updated_at', 'payout_details_summary']
    list_select_related = ['vendor']

    def payout_threshold_display(self, obj):
        return f"KES {obj.payout_threshold:,.2f}"
    payout_threshold_display.short_description = 'Payout Threshold'

    def payout_details_summary_display(self, obj):
        return obj.payout_details_summary
    payout_details_summary_display.short_description = 'Payout Details'

@admin.register(VendorEarning)
class VendorEarningAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'vendor', 'earning_type', 'gross_amount_display', 
        'commission_amount_display', 'net_amount_display', 'status', 
        'created_date'
    ]
    list_filter = ['earning_type', 'status', 'created_at']
    search_fields = [
        'vendor__business_name', 'order__id', 'description'
    ]
    readonly_fields = [
        'created_at', 'processed_at', 'gross_amount', 'commission_amount', 
        'net_amount', 'commission_rate'
    ]
    date_hierarchy = 'created_at'
    list_select_related = ['vendor', 'order']

    def gross_amount_display(self, obj):
        return f"KES {obj.gross_amount:,.2f}"
    gross_amount_display.short_description = 'Gross Amount'
    gross_amount_display.admin_order_field = 'gross_amount'

    def commission_amount_display(self, obj):
        return f"KES {obj.commission_amount:,.2f}"
    commission_amount_display.short_description = 'Commission'
    commission_amount_display.admin_order_field = 'commission_amount'

    def net_amount_display(self, obj):
        return f"KES {obj.net_amount:,.2f}"
    net_amount_display.short_description = 'Net Amount'
    net_amount_display.admin_order_field = 'net_amount'

    def created_date(self, obj):
        return obj.created_at.date()
    created_date.short_description = 'Created Date'
    created_date.admin_order_field = 'created_at'

    actions = ['mark_as_processed', 'mark_as_paid']

    def mark_as_processed(self, request, queryset):
        updated = queryset.update(status='processed')
        self.message_user(request, f'{updated} earnings marked as processed.')
    mark_as_processed.short_description = "Mark selected earnings as processed"

    def mark_as_paid(self, request, queryset):
        updated = queryset.update(status='paid')
        self.message_user(request, f'{updated} earnings marked as paid.')
    mark_as_paid.short_description = "Mark selected earnings as paid"

@admin.register(PayoutTransaction)
class PayoutTransactionAdmin(admin.ModelAdmin):
    list_display = [
        'payout_reference', 'vendor', 'payout_method', 
        'amount_display', 'status', 'initiated_date', 'completed_date'
    ]
    list_filter = ['payout_method', 'status', 'initiated_at']
    search_fields = [
        'vendor__business_name', 'payout_reference', 
        'recipient_details'
    ]
    readonly_fields = [
        'initiated_at', 'processed_at', 'completed_at', 
        'gateway_response', 'payout_details'
    ]
    date_hierarchy = 'initiated_at'
    list_select_related = ['vendor']

    def amount_display(self, obj):
        return f"KES {obj.amount:,.2f}"
    amount_display.short_description = 'Amount'
    amount_display.admin_order_field = 'amount'

    def initiated_date(self, obj):
        return obj.initiated_at.date()
    initiated_date.short_description = 'Initiated Date'
    initiated_date.admin_order_field = 'initiated_at'

    def completed_date(self, obj):
        return obj.completed_at.date() if obj.completed_at else '-'
    completed_date.short_description = 'Completed Date'

    def payout_details(self, obj):
        return format_html(
            """
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <strong>Payout Details:</strong><br>
                Method: {method}<br>
                Amount: KES {amount:,.2f}<br>
                Status: {status}<br>
                Reference: {reference}
            </div>
            """.format(
                method=obj.get_payout_method_display(),
                amount=obj.amount,
                status=obj.status,
                reference=obj.payout_reference
            )
        )
    payout_details.short_description = 'Payout Details'

    actions = ['mark_as_processing', 'mark_as_completed', 'mark_as_failed']

    def mark_as_processing(self, request, queryset):
        updated = queryset.update(status='processing')
        self.message_user(request, f'{updated} payouts marked as processing.')
    mark_as_processing.short_description = "Mark selected payouts as processing"

    def mark_as_completed(self, request, queryset):
        updated = queryset.update(status='completed')
        self.message_user(request, f'{updated} payouts marked as completed.')
    mark_as_completed.short_description = "Mark selected payouts as completed"

    def mark_as_failed(self, request, queryset):
        updated = queryset.update(status='failed')
        self.message_user(request, f'{updated} payouts marked as failed.')
    mark_as_failed.short_description = "Mark selected payouts as failed"

@admin.register(VendorPerformance)
class VendorPerformanceAdmin(admin.ModelAdmin):
    list_display = [
        'vendor', 'total_orders', 'completed_orders', 
        'total_revenue_display', 'total_earnings_display',
        'completion_rate_display', 'customer_satisfaction_score'
    ]
    list_filter = ['metrics_updated_at']
    search_fields = ['vendor__business_name']
    readonly_fields = [
        'metrics_updated_at', 'performance_metrics', 
        'completion_rate', 'cancellation_rate'
    ]
    list_select_related = ['vendor']

    def total_revenue_display(self, obj):
        return f"KES {obj.total_revenue:,.2f}"
    total_revenue_display.short_description = 'Total Revenue'
    total_revenue_display.admin_order_field = 'total_revenue'

    def total_earnings_display(self, obj):
        return f"KES {obj.total_earnings:,.2f}"
    total_earnings_display.short_description = 'Total Earnings'
    total_earnings_display.admin_order_field = 'total_earnings'

    def completion_rate_display(self, obj):
        return f"{obj.completion_rate:.1f}%"
    completion_rate_display.short_description = 'Completion Rate'
    completion_rate_display.admin_order_field = 'completion_rate'

    def performance_metrics(self, obj):
        return format_html(
            """
            <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <strong>Performance Metrics:</strong><br>
                Completion Rate: {completion_rate:.1f}%<br>
                Cancellation Rate: {cancellation_rate:.1f}%<br>
                Average Order Value: KES {avg_order:,.2f}<br>
                Repeat Customers: {repeat_customers}<br>
                Satisfaction Score: {satisfaction_score}/5
            </div>
            """.format(
                completion_rate=obj.completion_rate,
                cancellation_rate=obj.cancellation_rate,
                avg_order=obj.average_order_value,
                repeat_customers=obj.repeat_customers,
                satisfaction_score=obj.customer_satisfaction_score
            )
        )
    performance_metrics.short_description = 'Performance Metrics'

# ========== EXISTING ADMIN CLASSES (UPDATED) ==========

@admin.register(GasProduct)
class GasProductAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'vendor', 'gas_type', 'cylinder_size', 
        'price_with_cylinder_display', 'price_without_cylinder_display', 
        'stock_quantity', 'low_stock_indicator', 'is_available'
    ]
    list_filter = [
        'gas_type', 'cylinder_size', 'is_available', 'is_active',
        'vendor__business_name', 'featured'
    ]
    search_fields = ['name', 'vendor__business_name', 'brand']
    readonly_fields = ['created_at', 'updated_at', 'in_stock', 'low_stock']
    list_select_related = ['vendor']
    
    actions = [
        'mark_as_featured', 'update_stock', 'activate_products', 
        'deactivate_products'
    ]

    def price_with_cylinder_display(self, obj):
        return f"KES {obj.price_with_cylinder:,.2f}"
    price_with_cylinder_display.short_description = 'Price with Cylinder'
    price_with_cylinder_display.admin_order_field = 'price_with_cylinder'

    def price_without_cylinder_display(self, obj):
        return f"KES {obj.price_without_cylinder:,.2f}"
    price_without_cylinder_display.short_description = 'Price without Cylinder'
    price_without_cylinder_display.admin_order_field = 'price_without_cylinder'

    def low_stock_indicator(self, obj):
        if obj.low_stock:
            return format_html('<span style="color: orange;">⚠ Low Stock</span>')
        elif not obj.in_stock:
            return format_html('<span style="color: red;">✗ Out of Stock</span>')
        return format_html('<span style="color: green;">✓ In Stock</span>')
    low_stock_indicator.short_description = 'Stock Status'

    def mark_as_featured(self, request, queryset):
        updated = queryset.update(featured=True)
        self.message_user(request, f'{updated} products marked as featured.')
    mark_as_featured.short_description = "Mark selected products as featured"

    def update_stock(self, request, queryset):
        # This would typically open a custom form to update stock
        self.message_user(request, 'Use the individual product form to update stock quantities.')
    update_stock.short_description = "Update stock quantities"

    def activate_products(self, request, queryset):
        updated = queryset.update(is_active=True, is_available=True)
        self.message_user(request, f'{updated} products activated.')
    activate_products.short_description = "Activate selected products"

    def deactivate_products(self, request, queryset):
        updated = queryset.update(is_active=False, is_available=False)
        self.message_user(request, f'{updated} products deactivated.')
    deactivate_products.short_description = "Deactivate selected products"

@admin.register(GasProductImage)
class GasProductImageAdmin(admin.ModelAdmin):
    list_display = ['product', 'image_preview', 'is_primary', 'created_at']
    list_filter = ['is_primary', 'created_at']
    search_fields = ['product__name']
    readonly_fields = ['created_at', 'image_preview']
    list_select_related = ['product']

    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="max-height: 50px; max-width: 50px;" />', obj.image.url)
        return "No image"
    image_preview.short_description = 'Preview'

@admin.register(GasPriceHistory)
class GasPriceHistoryAdmin(admin.ModelAdmin):
    list_display = ['product', 'price_with_cylinder_display', 'price_without_cylinder_display', 'effective_date']
    list_filter = ['effective_date', 'created_at']
    search_fields = ['product__name']
    readonly_fields = ['created_at']
    list_select_related = ['product']
    date_hierarchy = 'effective_date'

    def price_with_cylinder_display(self, obj):
        return f"KES {obj.price_with_cylinder:,.2f}"
    price_with_cylinder_display.short_description = 'Price with Cylinder'

    def price_without_cylinder_display(self, obj):
        return f"KES {obj.price_without_cylinder:,.2f}"
    price_without_cylinder_display.short_description = 'Price without Cylinder'

@admin.register(VendorReview)
class VendorReviewAdmin(admin.ModelAdmin):
    list_display = ['vendor', 'customer', 'rating_stars', 'created_date']
    list_filter = ['rating', 'created_at']
    search_fields = ['vendor__business_name', 'customer__username', 'comment']
    readonly_fields = ['created_at']
    list_select_related = ['vendor', 'customer']

    def rating_stars(self, obj):
        stars = '★' * obj.rating + '☆' * (5 - obj.rating)
        return format_html('<span style="color: gold;">{}</span>', stars)
    rating_stars.short_description = 'Rating'

    def created_date(self, obj):
        return obj.created_at.date()
    created_date.short_description = 'Review Date'

@admin.register(OperatingHours)
class OperatingHoursAdmin(admin.ModelAdmin):
    list_display = ['vendor', 'day_display', 'opening_time', 'closing_time', 'is_closed']
    list_filter = ['day', 'is_closed']
    search_fields = ['vendor__business_name']
    list_select_related = ['vendor']

    def day_display(self, obj):
        return obj.get_day_display()
    day_display.short_description = 'Day'