# orders/serializers.py
from rest_framework import serializers
from .models import Order, OrderTracking, Cart, CartItem, OrderItem

class OrderTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderTracking
        fields = ['id', 'status', 'note', 'created_at']

class CartItemSerializer(serializers.ModelSerializer):
    service_details = serializers.SerializerMethodField()
    gas_product_details = serializers.SerializerMethodField()
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    item_name = serializers.SerializerMethodField()
    vendor_info = serializers.SerializerMethodField()
    
    class Meta:
        model = CartItem
        fields = [
            'id', 'item_type', 'service', 'service_details', 'gas_product', 
            'gas_product_details', 'quantity', 'total_price', 'item_name', 
            'vendor_info', 'added_at'
        ]
        read_only_fields = ['total_price', 'item_name', 'vendor_info']
    
    def get_service_details(self, obj):
        if obj.service:
            from services.serializers import ServiceSerializer
            return ServiceSerializer(obj.service).data
        return None
    
    def get_gas_product_details(self, obj):
        if obj.gas_product:
            from vendors.serializers import GasProductListSerializer
            return GasProductListSerializer(obj.gas_product).data
        return None
    
    def get_item_name(self, obj):
        return obj.item_name
    
    def get_vendor_info(self, obj):
        if obj.vendor:
            from vendors.serializers import VendorMinimalSerializer
            return VendorMinimalSerializer(obj.vendor).data
        return None
    
    # ✅ ADDED: FIX FOR item_type ISSUE
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # If it's a gas product but has wrong item_type, fix it
        if instance.gas_product and data.get('item_type') != 'gas_product':
            data['item_type'] = 'gas_product'
        
        # Ensure gas_product_details is populated
        if instance.gas_product and not data.get('gas_product_details'):
            data['gas_product_details'] = self.get_gas_product_details(instance)
            
        # If it's a service but has wrong item_type, fix it
        if instance.service and data.get('item_type') != 'service':
            data['item_type'] = 'service'
            
        return data

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Cart
        fields = ['id', 'items', 'total_amount', 'item_count', 'created_at', 'updated_at']

class OrderItemSerializer(serializers.ModelSerializer):
    service_details = serializers.SerializerMethodField()
    gas_product_details = serializers.SerializerMethodField()
    item_name = serializers.SerializerMethodField()
    vendor_info = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'item_type', 'service', 'service_details', 'gas_product', 
            'gas_product_details', 'quantity', 'unit_price', 'total_price', 
            'item_name', 'vendor_info'
        ]
    
    def get_service_details(self, obj):
        if obj.service:
            from services.serializers import ServiceSerializer
            return ServiceSerializer(obj.service).data
        return None
    
    def get_gas_product_details(self, obj):
        if obj.gas_product:
            from vendors.serializers import GasProductListSerializer
            return GasProductListSerializer(obj.gas_product).data
        return None
    
    def get_item_name(self, obj):
        return obj.item_name
    
    def get_vendor_info(self, obj):
        if obj.vendor:
            from vendors.serializers import VendorMinimalSerializer
            return VendorMinimalSerializer(obj.vendor).data
        return None
    
    # ✅ ADDED: FIX FOR item_type ISSUE IN ORDER ITEMS TOO
    def to_representation(self, instance):
        data = super().to_representation(instance)
        
        # If it's a gas product but has wrong item_type, fix it
        if instance.gas_product and data.get('item_type') != 'gas_product':
            data['item_type'] = 'gas_product'
        
        # If it's a service but has wrong item_type, fix it
        if instance.service and data.get('item_type') != 'service':
            data['item_type'] = 'service'
            
        return data

class OrderSerializer(serializers.ModelSerializer):
    service_details = serializers.SerializerMethodField()
    gas_product_details = serializers.SerializerMethodField()
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True)
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    tracking = OrderTrackingSerializer(many=True, read_only=True)
    order_items = OrderItemSerializer(many=True, read_only=True)
    
    # ========== NEW FIELDS FOR VENDOR DASHBOARD ==========
    commission_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    is_ready_for_payment = serializers.BooleanField(read_only=True)
    can_be_completed = serializers.BooleanField(read_only=True)
    time_since_created = serializers.DurationField(read_only=True)
    estimated_completion_date = serializers.DateTimeField(read_only=True)
    
    # Vendor contact information
    customer_phone = serializers.CharField(read_only=True)
    customer_email = serializers.EmailField(read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'customer', 'customer_name', 'vendor', 'vendor_name', 
            'order_type', 'service', 'service_details', 'gas_product', 'gas_product_details',
            'quantity', 'unit_price', 'total_amount', 'delivery_type',
            'location_lat', 'location_lng', 'delivery_address', 'special_instructions', 
            'status', 'payment_status', 'created_at', 'updated_at', 
            'confirmed_at', 'completed_at', 'tracking', 'order_items',
            
            # New commission fields
            'commission_rate', 'vendor_earnings', 'commission_amount',
            
            # New vendor dashboard fields
            'priority', 'customer_phone', 'customer_email', 
            'estimated_completion_time', 'estimated_completion_date',
            'is_ready_for_payment', 'can_be_completed', 'time_since_created'
        ]
        read_only_fields = [
            'customer', 'vendor', 'unit_price', 'total_amount', 
            'created_at', 'updated_at', 'service_details', 'gas_product_details',
            'commission_amount', 'is_ready_for_payment', 'can_be_completed',
            'time_since_created', 'estimated_completion_date', 'vendor_earnings'
        ]
    
    def get_service_details(self, obj):
        if obj.service:
            from services.serializers import ServiceSerializer
            return ServiceSerializer(obj.service).data
        return None
    
    def get_gas_product_details(self, obj):
        if obj.gas_product:
            from vendors.serializers import GasProductListSerializer
            return GasProductListSerializer(obj.gas_product).data
        return None

class OrderDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for vendor dashboard with comprehensive order info"""
    service_details = serializers.SerializerMethodField()
    gas_product_details = serializers.SerializerMethodField()
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True)
    vendor_contact = serializers.CharField(source='vendor.contact_number', read_only=True)
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    tracking = OrderTrackingSerializer(many=True, read_only=True)
    order_items = OrderItemSerializer(many=True, read_only=True)
    
    # Commission and financial details
    commission_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    zeno_commission_percentage = serializers.DecimalField(
        source='commission_rate', max_digits=5, decimal_places=2, read_only=True
    )
    
    # Status indicators
    is_ready_for_payment = serializers.BooleanField(read_only=True)
    can_be_completed = serializers.BooleanField(read_only=True)
    time_since_created = serializers.DurationField(read_only=True)
    estimated_completion_date = serializers.DateTimeField(read_only=True)
    
    # Payment information
    payment_details = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'customer', 'customer_name', 'customer_username', 
            'vendor', 'vendor_name', 'vendor_contact',
            'order_type', 'service', 'service_details', 'gas_product', 'gas_product_details',
            'quantity', 'unit_price', 'total_amount', 'delivery_type',
            'location_lat', 'location_lng', 'delivery_address', 'special_instructions', 
            'status', 'payment_status', 'created_at', 'updated_at', 
            'confirmed_at', 'completed_at', 'tracking', 'order_items',
            
            # Commission and financial
            'commission_rate', 'vendor_earnings', 'commission_amount', 'zeno_commission_percentage',
            
            # Vendor dashboard fields
            'priority', 'customer_phone', 'customer_email', 
            'estimated_completion_time', 'estimated_completion_date',
            'is_ready_for_payment', 'can_be_completed', 'time_since_created',
            
            # Additional details
            'payment_details'
        ]
        read_only_fields = ['__all__']
    
    def get_service_details(self, obj):
        if obj.service:
            from services.serializers import ServiceSerializer
            return ServiceSerializer(obj.service).data
        return None
    
    def get_gas_product_details(self, obj):
        if obj.gas_product:
            from vendors.serializers import GasProductListSerializer
            return GasProductListSerializer(obj.gas_product).data
        return None
    
    def get_payment_details(self, obj):
        """Get payment information if exists"""
        if hasattr(obj, 'payment'):
            from payments.serializers import PaymentSerializer
            return PaymentSerializer(obj.payment).data
        return None

class VendorOrderSerializer(serializers.ModelSerializer):
    """Lightweight serializer for vendor order listings"""
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    customer_phone = serializers.CharField(read_only=True)
    time_since_created = serializers.DurationField(read_only=True)
    commission_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'customer', 'customer_name', 'customer_phone',
            'order_type', 'quantity', 'total_amount', 'delivery_type',
            'delivery_address', 'status', 'payment_status', 
            'commission_rate', 'vendor_earnings', 'commission_amount',
            'priority', 'created_at', 'time_since_created'
        ]
        read_only_fields = ['__all__']

class CreateOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'service', 'quantity', 'location_lat', 'location_lng', 
            'delivery_address', 'special_instructions', 'delivery_type'
        ]
    
    def validate(self, data):
        service = data['service']
        if not service.available:
            raise serializers.ValidationError("This service is currently unavailable")
        return data

class CreateGasProductOrderSerializer(serializers.ModelSerializer):
    gas_product_id = serializers.IntegerField(write_only=True)
    delivery_type = serializers.ChoiceField(choices=[
        ('delivery', 'Delivery'), 
        ('pickup', 'Pickup')
    ], default='delivery')
    
    class Meta:
        model = Order
        fields = [
            'gas_product_id', 'quantity', 'delivery_type', 'location_lat', 
            'location_lng', 'delivery_address', 'special_instructions'
        ]
    
    def validate(self, data):
        gas_product_id = data.get('gas_product_id')
        quantity = data.get('quantity', 1)
        
        try:
            from vendors.models import GasProduct
            gas_product = GasProduct.objects.get(id=gas_product_id, is_active=True, is_available=True)
        except GasProduct.DoesNotExist:
            raise serializers.ValidationError("Gas product not found or unavailable")
        
        # Check stock availability
        if gas_product.stock_quantity < quantity:
            raise serializers.ValidationError(
                f"Only {gas_product.stock_quantity} units available in stock"
            )
        
        data['gas_product'] = gas_product
        data['vendor'] = gas_product.vendor
        data['unit_price'] = gas_product.price_with_cylinder
        
        # Set commission rate from vendor or default
        data['commission_rate'] = gas_product.vendor.commission_rate
        
        return data

# ✅ CRITICAL FIX: COMPLETELY UPDATED CreateMixedOrderSerializer
class CreateMixedOrderSerializer(serializers.Serializer):
    """Serializer for orders containing both services and gas products"""
    items = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    delivery_type = serializers.ChoiceField(choices=[
        ('delivery', 'Delivery'), 
        ('pickup', 'Pickup'),
        ('on_site', 'On-Site Service')
    ], required=True)
    delivery_address = serializers.CharField(required=True)
    special_instructions = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.ChoiceField(choices=Order._meta.get_field('priority').choices, default='normal')
    
    def validate_items(self, items):
        if len(items) == 0:
            raise serializers.ValidationError("At least one item is required")
        
        validated_items = []
        for item in items:
            # ✅ CRITICAL FIX: Get item_type from the item data, don't rely on object detection
            item_type = item.get('item_type')  # ✅ CHANGED: Use 'item_type' not 'type'
            item_id = item.get('product')  # ✅ CHANGED: Use 'product' not 'id'
            
            if not item_type:
                raise serializers.ValidationError("Item type is required for each item")
            
            quantity = item.get('quantity', 1)
            
            if item_type == 'gas_product':
                from vendors.models import GasProduct
                try:
                    gas_product = GasProduct.objects.get(id=item_id, is_active=True, is_available=True)
                    if gas_product.stock_quantity < quantity:
                        raise serializers.ValidationError(
                            f"Not enough stock for {gas_product.name}"
                        )
                    validated_items.append({
                        'type': 'gas_product',
                        'object': gas_product,
                        'quantity': quantity,
                        'unit_price': item.get('unit_price', gas_product.price_with_cylinder),
                        'vendor': gas_product.vendor,
                        'include_cylinder': item.get('include_cylinder', False)
                    })
                except GasProduct.DoesNotExist:
                    raise serializers.ValidationError(f"Gas product with ID {item_id} not found")
            else:
                raise serializers.ValidationError(f"Invalid item type: {item_type}")
        
        # Check if all items belong to the same vendor
        vendors = set(item['vendor'].id for item in validated_items)
        if len(vendors) > 1:
            raise serializers.ValidationError("All items must be from the same vendor")
        
        return validated_items

# ✅ ADDED: NEW SIMPLE SERIALIZER FOR GAS PRODUCT ORDERS
class CreateGasProductOrderSimpleSerializer(serializers.ModelSerializer):
    items = serializers.ListField(
        child=serializers.DictField(),
        write_only=True
    )
    
    class Meta:
        model = Order
        fields = [
            'vendor', 'items', 'delivery_type', 'delivery_address',
            'delivery_latitude', 'delivery_longitude', 'special_instructions'
        ]
    
    def validate(self, data):
        items = data.get('items', [])
        if not items:
            raise serializers.ValidationError({"items": "At least one item is required"})
        
        # Validate each item
        for item in items:
            if not item.get('item_type'):
                raise serializers.ValidationError({"items": "Item type is required for each item"})
            
            if item.get('item_type') != 'gas_product':
                raise serializers.ValidationError({"items": f"Invalid item type: {item.get('item_type')}"})
        
        return data
    
    def create(self, validated_data):
        items = validated_data.pop('items')
        vendor = validated_data.get('vendor')
        
        # Create the order
        order = Order.objects.create(
            customer=self.context['request'].user,
            vendor=vendor,
            order_type='gas_product',
            **validated_data
        )
        
        # Create order items
        for item in items:
            OrderItem.objects.create(
                order=order,
                item_type=item['item_type'],
                gas_product_id=item['product'],
                quantity=item['quantity'],
                unit_price=item['unit_price'],
                include_cylinder=item.get('include_cylinder', False)
            )
            
            # Update stock
            from vendors.models import GasProduct
            gas_product = GasProduct.objects.get(id=item['product'])
            gas_product.stock_quantity -= item['quantity']
            gas_product.save()
        
        # Create initial tracking
        OrderTracking.objects.create(order=order, status='pending')
        
        return order

class UpdateOrderStatusSerializer(serializers.ModelSerializer):
    note = serializers.CharField(required=False, allow_blank=True, write_only=True)
    
    class Meta:
        model = Order
        fields = ['status', 'note']
    
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
    
    def update(self, instance, validated_data):
        note = validated_data.pop('note', '')
        new_status = validated_data['status']
        
        # Create tracking entry
        OrderTracking.objects.create(
            order=instance,
            status=new_status,
            note=note
        )
        
        return super().update(instance, validated_data)

class UpdateOrderPrioritySerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['priority']

class UpdateOrderCompletionTimeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['estimated_completion_time']

class OrderAnalyticsSerializer(serializers.Serializer):
    """Serializer for order analytics in vendor dashboard"""
    total_orders = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    completed_orders = serializers.IntegerField()
    cancelled_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_commission = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_vendor_earnings = serializers.DecimalField(max_digits=12, decimal_places=2)
    average_order_value = serializers.DecimalField(max_digits=10, decimal_places=2)
    completion_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    
    # Time-based analytics
    daily_orders = serializers.JSONField()
    weekly_revenue = serializers.JSONField()

class BulkOrderStatusUpdateSerializer(serializers.Serializer):
    """Serializer for bulk order status updates"""
    order_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )
    status = serializers.ChoiceField(choices=Order._meta.get_field('status').choices)
    note = serializers.CharField(required=False, allow_blank=True)
    
    def validate_order_ids(self, value):
        # Verify all orders exist and belong to the vendor
        from .models import Order
        valid_orders = Order.objects.filter(
            id__in=value,
            vendor__user=self.context['request'].user
        ).values_list('id', flat=True)
        
        invalid_ids = set(value) - set(valid_orders)
        if invalid_ids:
            raise serializers.ValidationError(
                f"Orders with IDs {invalid_ids} not found or don't belong to you"
            )
        
        return value