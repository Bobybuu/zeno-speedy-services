# orders/admin.py
from django.contrib import admin
from .models import Order, OrderTracking, Cart, CartItem

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'vendor', 'service', 'total_amount', 'status', 'payment_status', 'created_at']
    list_filter = ['status', 'payment_status', 'created_at', 'vendor__business_type']
    search_fields = ['customer__email', 'vendor__business_name', 'service__name']
    readonly_fields = ['created_at', 'updated_at', 'confirmed_at', 'completed_at']
    actions = ['mark_as_completed', 'mark_as_cancelled']
    
    def mark_as_completed(self, request, queryset):
        queryset.update(status='completed')
    mark_as_completed.short_description = "Mark selected orders as completed"
    
    def mark_as_cancelled(self, request, queryset):
        queryset.update(status='cancelled')
    mark_as_cancelled.short_description = "Mark selected orders as cancelled"

@admin.register(OrderTracking)
class OrderTrackingAdmin(admin.ModelAdmin):
    list_display = ['order', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    readonly_fields = ['created_at']

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'created_at', 'updated_at']
    list_filter = ['created_at']
    readonly_fields = ['created_at', 'updated_at']

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'cart', 'service', 'quantity', 'created_at']
    list_filter = ['created_at']
    readonly_fields = ['created_at']