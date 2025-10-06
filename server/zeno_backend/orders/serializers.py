# orders/serializers.py
from rest_framework import serializers
from .models import Order, OrderTracking, Cart, CartItem
from services.serializers import ServiceSerializer

class CartItemSerializer(serializers.ModelSerializer):
    service_details = ServiceSerializer(source='service', read_only=True)
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = CartItem
        fields = ['id', 'service', 'service_details', 'quantity', 'total_price', 'added_at']

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_amount', 'item_count', 'created_at', 'updated_at']

class OrderTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderTracking
        fields = ['id', 'status', 'note', 'created_at']

class OrderSerializer(serializers.ModelSerializer):
    service_details = ServiceSerializer(source='service', read_only=True)
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True)
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    tracking = OrderTrackingSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'customer', 'customer_name', 'vendor', 'vendor_name', 'service', 'service_details',
            'quantity', 'unit_price', 'total_amount', 'location_lat', 'location_lng',
            'delivery_address', 'special_instructions', 'status', 'payment_status',
            'created_at', 'updated_at', 'confirmed_at', 'completed_at', 'tracking'
        ]
        read_only_fields = ['customer', 'vendor', 'unit_price', 'total_amount', 'created_at', 'updated_at']

class CreateOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'service', 'quantity', 'location_lat', 'location_lng', 
            'delivery_address', 'special_instructions'
        ]
    
    def validate(self, data):
        service = data['service']
        if not service.available:
            raise serializers.ValidationError("This service is currently unavailable")
        return data

class UpdateOrderStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['status']
    
    def validate_status(self, value):
        valid_transitions = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['in_progress', 'cancelled'],
            'in_progress': ['completed', 'cancelled'],
            'completed': [],
            'cancelled': [],
            'failed': [],
        }
        
        current_status = self.instance.status
        if value not in valid_transitions.get(current_status, []):
            raise serializers.ValidationError(
                f"Cannot change status from {current_status} to {value}"
            )
        return value