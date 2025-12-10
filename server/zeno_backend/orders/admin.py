# orders/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum, Avg, Count
from django.utils import timezone
from datetime import timedelta
from .models import Order, OrderTracking, Cart, CartItem, OrderItem

class OrderTrackingInline(admin.TabularInline):
    model = OrderTracking
    extra = 0
    readonly_fields = ['created_at']
    can_delete = False

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ['total_price']
    can_delete = False

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'customer', 'vendor', 'order_type', 'total_amount', 
        'status', 'payment_status', 'priority', 'commission_rate',
        'vendor_earnings', 'created_at', 'order_actions'
    ]
    
    list_filter = [
        'status', 'payment_status', 'order_type', 'delivery_type', 
        'priority', 'created_at', 'vendor'
    ]
    
    search_fields = [
        'customer__email', 'customer__username', 
        'vendor__business_name', 'delivery_address',
        'customer_phone', 'customer_email'
    ]
    
    readonly_fields = [
        'created_at', 'updated_at', 'confirmed_at', 'completed_at',
        'total_amount', 'commission_amount', 'vendor_earnings',
        'is_ready_for_payment', 'can_be_completed', 'time_since_created',
        'estimated_completion_date'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': (
                'customer', 'vendor', 'order_type', 
                'status', 'payment_status', 'priority'
            )
        }),
        ('Order Details', {
            'fields': (
                'service', 'gas_product', 'quantity', 
                'unit_price', 'total_amount', 'delivery_type'
            )
        }),
        ('Location & Instructions', {
            'fields': (
                'location_lat', 'location_lng', 
                'delivery_address', 'special_instructions'
            )
        }),
        ('Commission & Financials', {
            'fields': (
                'commission_rate', 'commission_amount', 
                'vendor_earnings'
            )
        }),
        ('Customer Contact', {
            'fields': (
                'customer_phone', 'customer_email'
            )
        }),
        ('Timing & Scheduling', {
            'fields': (
                'estimated_completion_time', 'estimated_completion_date',
                'created_at', 'updated_at', 'confirmed_at', 'completed_at'
            )
        }),
        ('Status Indicators', {
            'fields': (
                'is_ready_for_payment', 'can_be_completed', 'time_since_created'
            )
        })
    )
    
    inlines = [OrderTrackingInline, OrderItemInline]
    
    actions = [
        'mark_as_completed', 'mark_as_cancelled', 'mark_as_paid',
        'update_priority_high', 'update_priority_normal', 'update_priority_low',
        'export_orders_csv', 'calculate_vendor_performance'
    ]
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'customer', 'vendor', 'service', 'gas_product'
        ).prefetch_related('tracking', 'items')
    
    def commission_amount(self, obj):
        return f"${obj.commission_amount:.2f}"
    commission_amount.short_description = 'Commission'
    
    def vendor_earnings_display(self, obj):
        return f"${obj.vendor_earnings:.2f}"
    vendor_earnings_display.short_description = 'Vendor Earnings'
    
    def order_actions(self, obj):
        return format_html(
            '<a class="button" href="{}">View Tracking</a>&nbsp;'
            '<a class="button" href="{}">Edit</a>',
            f'../ordertracking/?order__id={obj.id}',
            f'{obj.id}/change/'
        )
    order_actions.short_description = 'Actions'
    order_actions.allow_tags = True
    
    # Custom Actions
    def mark_as_completed(self, request, queryset):
        updated = queryset.update(status='completed')
        self.message_user(request, f'{updated} orders marked as completed.')
    mark_as_completed.short_description = "Mark selected orders as completed"
    
    def mark_as_cancelled(self, request, queryset):
        updated = queryset.update(status='cancelled')
        self.message_user(request, f'{updated} orders marked as cancelled.')
    mark_as_cancelled.short_description = "Mark selected orders as cancelled"
    
    def mark_as_paid(self, request, queryset):
        updated = queryset.update(payment_status='paid')
        self.message_user(request, f'{updated} orders marked as paid.')
    mark_as_paid.short_description = "Mark selected orders as paid"
    
    def update_priority_high(self, request, queryset):
        updated = queryset.update(priority='high')
        self.message_user(request, f'{updated} orders set to high priority.')
    update_priority_high.short_description = "Set priority to High"
    
    def update_priority_normal(self, request, queryset):
        updated = queryset.update(priority='normal')
        self.message_user(request, f'{updated} orders set to normal priority.')
    update_priority_normal.short_description = "Set priority to Normal"
    
    def update_priority_low(self, request, queryset):
        updated = queryset.update(priority='low')
        self.message_user(request, f'{updated} orders set to low priority.')
    update_priority_low.short_description = "Set priority to Low"
    
    def export_orders_csv(self, request, queryset):
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="orders_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Order ID', 'Customer', 'Vendor', 'Order Type', 'Total Amount',
            'Status', 'Payment Status', 'Commission Rate', 'Vendor Earnings',
            'Created At', 'Completed At'
        ])
        
        for order in queryset:
            writer.writerow([
                order.id, order.customer.email, order.vendor.business_name,
                order.order_type, order.total_amount, order.status,
                order.payment_status, order.commission_rate, order.vendor_earnings,
                order.created_at, order.completed_at
            ])
        
        return response
    export_orders_csv.short_description = "Export selected orders to CSV"
    
    def calculate_vendor_performance(self, request, queryset):
        for order in queryset:
            order.update_vendor_performance()
        self.message_user(request, f'Vendor performance updated for {queryset.count()} orders.')
    calculate_vendor_performance.short_description = "Update vendor performance metrics"

@admin.register(OrderTracking)
class OrderTrackingAdmin(admin.ModelAdmin):
    list_display = ['id', 'order_link', 'status', 'created_at', 'note_preview']
    list_filter = ['status', 'created_at']
    readonly_fields = ['created_at']
    search_fields = ['order__id', 'note']
    date_hierarchy = 'created_at'
    
    def order_link(self, obj):
        return format_html(
            '<a href="../order/{}/change/">Order #{}</a>',
            obj.order.id, obj.order.id
        )
    order_link.short_description = 'Order'
    
    def note_preview(self, obj):
        return obj.note[:50] + '...' if len(obj.note) > 50 else obj.note
    note_preview.short_description = 'Note Preview'

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'item_count', 'total_amount', 
        'created_at', 'updated_at', 'cart_actions'
    ]
    
    list_filter = ['created_at', 'updated_at']
    readonly_fields = ['created_at', 'updated_at', 'total_amount', 'item_count']
    search_fields = ['user__email', 'user__username']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user').prefetch_related('items')
    
    def cart_actions(self, obj):
        return format_html(
            '<a class="button" href="{}">View Items</a>',
            f'../cartitem/?cart__id={obj.id}'
        )
    cart_actions.short_description = 'Actions'

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'cart', 'item_type', 'item_name', 'vendor_name',
        'quantity', 'unit_price', 'total_price', 'added_at'
    ]
    
    list_filter = ['item_type', 'added_at']
    readonly_fields = ['added_at', 'unit_price', 'total_price']
    search_fields = [
        'cart__user__email', 'service__name', 
        'gas_product__name', 'cart__user__username'
    ]
    
    def vendor_name(self, obj):
        if obj.vendor:
            return obj.vendor.business_name
        return "No Vendor"
    vendor_name.short_description = 'Vendor'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'cart__user', 'service', 'gas_product', 'service__vendor', 'gas_product__vendor'
        )

@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'order_link', 'item_type', 'item_name', 'vendor_name',
        'quantity', 'unit_price', 'total_price'
    ]
    
    list_filter = ['item_type']
    readonly_fields = ['total_price']
    search_fields = [
        'order__id', 'service__name', 'gas_product__name',
        'order__customer__email', 'order__vendor__business_name'
    ]
    
    def order_link(self, obj):
        return format_html(
            '<a href="../order/{}/change/">Order #{}</a>',
            obj.order.id, obj.order.id
        )
    order_link.short_description = 'Order'
    
    def item_name(self, obj):
        if obj.service:
            return obj.service.name
        elif obj.gas_product:
            return obj.gas_product.name
        return "Unknown Item"
    item_name.short_description = 'Item Name'
    
    def vendor_name(self, obj):
        if obj.vendor:
            return obj.vendor.business_name
        return "No Vendor"
    vendor_name.short_description = 'Vendor'

# Custom Admin Views for Analytics
class OrderAnalyticsAdmin(admin.ModelAdmin):
    """Custom admin view for order analytics"""
    
    def changelist_view(self, request, extra_context=None):
        # Calculate analytics data
        total_orders = Order.objects.count()
        completed_orders = Order.objects.filter(status='completed').count()
        pending_orders = Order.objects.filter(status='pending').count()
        cancelled_orders = Order.objects.filter(status='cancelled').count()
        
        # Financial metrics
        revenue_data = Order.objects.filter(status='completed').aggregate(
            total_revenue=Sum('total_amount'),
            total_commission=Sum('commission_amount'),
            total_vendor_earnings=Sum('vendor_earnings')
        )
        
        # Recent orders
        recent_orders = Order.objects.select_related('customer', 'vendor').order_by('-created_at')[:10]
        
        extra_context = {
            'total_orders': total_orders,
            'completed_orders': completed_orders,
            'pending_orders': pending_orders,
            'cancelled_orders': cancelled_orders,
            'completion_rate': (completed_orders / total_orders * 100) if total_orders > 0 else 0,
            'total_revenue': revenue_data['total_revenue'] or 0,
            'total_commission': revenue_data['total_commission'] or 0,
            'total_vendor_earnings': revenue_data['total_vendor_earnings'] or 0,
            'recent_orders': recent_orders,
        }
        
        return super().changelist_view(request, extra_context=extra_context)

# Add a custom admin dashboard if needed
def order_analytics_view(request):
    """Custom admin view for order analytics"""
    from django.shortcuts import render
    
    # Your analytics logic here
    context = {
        'title': 'Order Analytics Dashboard',
        # Add your analytics data
    }
    
    return render(request, 'admin/orders/order_analytics.html', context)