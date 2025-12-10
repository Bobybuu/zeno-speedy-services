# vendors/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import models
from .models import (
    Vendor, VendorReview, OperatingHours, GasProduct, GasProductImage, 
    GasPriceHistory, VendorPayoutPreference, VendorEarning, PayoutTransaction, 
    VendorPerformance
)

User = get_user_model()

# ========== VENDOR REGISTRATION SERIALIZERS ==========

class VendorSerializer(serializers.ModelSerializer):
    """Main Vendor serializer for registration and profile management"""
    business_type_display = serializers.CharField(source='get_business_type_display', read_only=True)
    is_operational = serializers.BooleanField(read_only=True)
    has_payout_preference = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Vendor
        fields = '__all__'
        read_only_fields = ('user', 'average_rating', 'total_reviews', 'is_verified', 
                           'total_earnings', 'available_balance', 'pending_payouts', 
                           'total_paid_out', 'total_orders_count', 'completed_orders_count', 
                           'active_customers_count', 'created_at', 'updated_at')

class VendorProfileSerializer(serializers.ModelSerializer):
    """Serializer for vendor profile with user data"""
    user = serializers.SerializerMethodField()
    business_type_display = serializers.CharField(source='get_business_type_display', read_only=True)
    is_operational = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Vendor
        fields = '__all__'
    
    def get_user(self, obj):
        from users.serializers import UserProfileSerializer
        return UserProfileSerializer(obj.user).data

# ========== NEW DASHBOARD SERIALIZERS ==========

class VendorPayoutPreferenceSerializer(serializers.ModelSerializer):
    """Serializer for vendor payout preferences"""
    payout_details_summary = serializers.CharField(read_only=True)
    
    class Meta:
        model = VendorPayoutPreference
        fields = [
            'id', 'payout_method', 'mobile_money_number', 'mobile_money_name',
            'bank_name', 'bank_type', 'account_number', 'account_name', 
            'branch_code', 'swift_code', 'is_verified', 'verification_document',
            'auto_payout', 'payout_threshold', 'payout_details_summary',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate payout details based on selected method"""
        payout_method = data.get('payout_method', self.instance.payout_method if self.instance else None)
        
        if payout_method == 'mpesa':
            if not data.get('mobile_money_number'):
                raise serializers.ValidationError({
                    'mobile_money_number': 'M-Pesa number is required for M-Pesa payouts'
                })
        elif payout_method == 'bank_transfer':
            required_fields = ['bank_name', 'account_number', 'account_name']
            for field in required_fields:
                if not data.get(field):
                    raise serializers.ValidationError({
                        field: f'{field.replace("_", " ").title()} is required for bank transfers'
                    })
        
        return data

class VendorEarningSerializer(serializers.ModelSerializer):
    """Serializer for vendor earnings"""
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    order_total = serializers.DecimalField(source='order.total_amount', read_only=True, max_digits=10, decimal_places=2)
    customer_name = serializers.CharField(source='order.customer.get_full_name', read_only=True)
    
    class Meta:
        model = VendorEarning
        fields = [
            'id', 'earning_type', 'gross_amount', 'commission_rate', 
            'commission_amount', 'net_amount', 'status', 'order_id', 
            'order_total', 'customer_name', 'description', 'created_at', 
            'processed_at'
        ]
        read_only_fields = [
            'id', 'gross_amount', 'commission_rate', 'commission_amount', 
            'net_amount', 'created_at', 'processed_at'
        ]

class PayoutTransactionSerializer(serializers.ModelSerializer):
    """Serializer for vendor payout transactions"""
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True)
    
    class Meta:
        model = PayoutTransaction
        fields = [
            'id', 'vendor', 'vendor_name', 'payout_method', 'payout_reference',
            'amount', 'currency', 'status', 'recipient_details', 'gateway_response',
            'initiated_at', 'processed_at', 'completed_at', 'description'
        ]
        read_only_fields = [
            'id', 'vendor', 'vendor_name', 'payout_reference', 'gateway_response',
            'initiated_at', 'processed_at', 'completed_at'
        ]

class VendorPerformanceSerializer(serializers.ModelSerializer):
    """Serializer for vendor performance metrics"""
    completion_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    cancellation_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    class Meta:
        model = VendorPerformance
        fields = [
            'id', 'total_orders', 'completed_orders', 'cancelled_orders',
            'average_order_value', 'total_revenue', 'total_commission',
            'total_earnings', 'repeat_customers', 'customer_satisfaction_score',
            'completion_rate', 'cancellation_rate', 'last_order_date',
            'metrics_updated_at'
        ]
        read_only_fields = ['id', 'metrics_updated_at']

class VendorDashboardAnalyticsSerializer(serializers.ModelSerializer):
    """Comprehensive analytics for vendor dashboard"""
    # Financial Analytics
    total_earnings = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    available_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    pending_payouts = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_paid_out = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    next_payout_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    # Order Analytics
    total_orders_count = serializers.IntegerField(read_only=True)
    completed_orders_count = serializers.IntegerField(read_only=True)
    order_completion_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    active_customers_count = serializers.IntegerField(read_only=True)
    
    # Product Analytics
    total_gas_products = serializers.IntegerField(read_only=True)
    available_gas_products = serializers.IntegerField(read_only=True)
    low_stock_products = serializers.SerializerMethodField()
    out_of_stock_products = serializers.SerializerMethodField()
    
    # Commission Analytics
    commission_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    average_commission = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    # Payout Status
    has_payout_preference = serializers.BooleanField(read_only=True)
    payout_preference = VendorPayoutPreferenceSerializer(read_only=True)
    
    # Recent Activity
    recent_earnings = serializers.SerializerMethodField()
    recent_payouts = serializers.SerializerMethodField()
    
    class Meta:
        model = Vendor
        fields = [
            # Financial
            'total_earnings', 'available_balance', 'pending_payouts', 
            'total_paid_out', 'next_payout_amount',
            
            # Orders
            'total_orders_count', 'completed_orders_count', 'order_completion_rate',
            'active_customers_count',
            
            # Products
            'total_gas_products', 'available_gas_products', 'low_stock_products',
            'out_of_stock_products',
            
            # Commission
            'commission_rate', 'average_commission',
            
            # Payout
            'has_payout_preference', 'payout_preference',
            
            # Recent Activity
            'recent_earnings', 'recent_payouts',
            
            # Basic Info
            'business_name', 'average_rating', 'total_reviews', 'is_verified'
        ]
    
    def get_low_stock_products(self, obj):
        return obj.gas_products.filter(
            stock_quantity__gt=0, 
            stock_quantity__lte=models.F('min_stock_alert'),
            is_active=True
        ).count()
    
    def get_out_of_stock_products(self, obj):
        return obj.gas_products.filter(stock_quantity=0, is_active=True).count()
    
    def get_recent_earnings(self, obj):
        recent_earnings = obj.earnings.all().order_by('-created_at')[:5]
        return VendorEarningSerializer(recent_earnings, many=True).data
    
    def get_recent_payouts(self, obj):
        recent_payouts = obj.payouts.all().order_by('-initiated_at')[:5]
        return PayoutTransactionSerializer(recent_payouts, many=True).data

class VendorOrderAnalyticsSerializer(serializers.Serializer):
    """Serializer for vendor order analytics"""
    date_period = serializers.CharField(required=False, default='7d')
    
    total_orders = serializers.IntegerField(read_only=True)
    pending_orders = serializers.IntegerField(read_only=True)
    completed_orders = serializers.IntegerField(read_only=True)
    cancelled_orders = serializers.IntegerField(read_only=True)
    
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_commission = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    net_earnings = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    average_order_value = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    order_completion_rate = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    
    # Time-based analytics
    daily_orders = serializers.JSONField(read_only=True)
    weekly_revenue = serializers.JSONField(read_only=True)
    monthly_earnings = serializers.JSONField(read_only=True)

class VendorPayoutHistorySerializer(serializers.ModelSerializer):
    """Serializer for vendor payout history"""
    earnings_count = serializers.SerializerMethodField()
    earnings_total = serializers.SerializerMethodField()
    
    class Meta:
        model = PayoutTransaction
        fields = [
            'id', 'payout_reference', 'payout_method', 'amount', 'currency',
            'status', 'earnings_count', 'earnings_total', 'initiated_at',
            'processed_at', 'completed_at', 'description'
        ]
        read_only_fields = ['id', 'payout_reference']
    
    def get_earnings_count(self, obj):
        return obj.earnings.count()
    
    def get_earnings_total(self, obj):
        return sum(earning.net_amount for earning in obj.earnings.all())

# ========== EXISTING SERIALIZERS (UPDATED) ==========

class GasProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = GasProductImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'created_at']
        read_only_fields = ['id', 'created_at']

class GasPriceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = GasPriceHistory
        fields = ['id', 'price_with_cylinder', 'price_without_cylinder', 'effective_date', 'created_at']
        read_only_fields = ['id', 'created_at']

class GasProductListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for product listings"""
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = GasProduct
        fields = [
            'id', 'name', 'gas_type', 'cylinder_size', 'vendor_name',
            'price_with_cylinder', 'price_without_cylinder', 'in_stock',
            'is_available', 'featured'
        ]

class GasProductSerializer(serializers.ModelSerializer):
    images = GasProductImageSerializer(many=True, read_only=True)
    price_history = GasPriceHistorySerializer(many=True, read_only=True)
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True)
    vendor_city = serializers.CharField(source='vendor.city', read_only=True)
    
    # Computed fields
    in_stock = serializers.BooleanField(read_only=True)
    low_stock = serializers.BooleanField(read_only=True)
    cylinder_deposit = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = GasProduct
        fields = [
            'id', 'vendor', 'vendor_name', 'vendor_city', 'name', 'gas_type', 
            'cylinder_size', 'brand', 'price_with_cylinder', 'price_without_cylinder',
            'cylinder_deposit', 'stock_quantity', 'min_stock_alert', 'description',
            'ingredients', 'safety_instructions', 'is_available', 'is_active',
            'featured', 'in_stock', 'low_stock', 'images', 'price_history',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['vendor', 'created_at', 'updated_at', 'cylinder_deposit']

class GasProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GasProduct
        fields = [
            'name', 'gas_type', 'cylinder_size', 'brand', 'price_with_cylinder',
            'price_without_cylinder', 'stock_quantity', 'min_stock_alert', 'description',
            'ingredients', 'safety_instructions', 'featured'
        ]
    
    def validate(self, data):
        # Validate that price_with_cylinder is greater than price_without_cylinder
        price_with = data.get('price_with_cylinder')
        price_without = data.get('price_without_cylinder')
        
        if price_with and price_without and price_with <= price_without:
            raise serializers.ValidationError({
                'price_with_cylinder': 'Price with cylinder must be greater than price without cylinder'
            })
        
        return data

class GasProductUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GasProduct
        fields = [
            'name', 'brand', 'price_with_cylinder', 'price_without_cylinder',
            'stock_quantity', 'min_stock_alert', 'description', 'ingredients',
            'safety_instructions', 'is_active', 'featured'
        ]
    
    def update(self, instance, validated_data):
        # Create price history if prices changed
        price_changed = (
            'price_with_cylinder' in validated_data and 
            validated_data['price_with_cylinder'] != instance.price_with_cylinder
        ) or (
            'price_without_cylinder' in validated_data and 
            validated_data['price_without_cylinder'] != instance.price_without_cylinder
        )
        
        if price_changed:
            GasPriceHistory.objects.create(
                product=instance,
                price_with_cylinder=instance.price_with_cylinder,
                price_without_cylinder=instance.price_without_cylinder
            )
        
        return super().update(instance, validated_data)

class GasProductStockUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GasProduct
        fields = ['stock_quantity', 'min_stock_alert']

class OperatingHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = OperatingHours
        fields = ['id', 'day', 'opening_time', 'closing_time', 'is_closed']

class VendorReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.get_full_name', read_only=True)
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    
    class Meta:
        model = VendorReview
        fields = ['id', 'customer', 'customer_name', 'customer_username', 'rating', 'comment', 'created_at']
        read_only_fields = ['customer', 'created_at']

class VendorLocationSerializer(serializers.ModelSerializer):
    """Minimal serializer for map displays"""
    class Meta:
        model = Vendor
        fields = ['id', 'business_name', 'latitude', 'longitude', 'city', 'address']

class VendorWithProductsSerializer(serializers.ModelSerializer):
    """Serializer for vendor detail page with products"""
    gas_products = GasProductListSerializer(many=True, read_only=True)
    
    class Meta:
        model = Vendor
        fields = [
            'id', 'business_name', 'business_type', 'description', 'address',
            'city', 'contact_number', 'average_rating', 'delivery_radius_km',
            'delivery_fee', 'gas_products', 'operating_hours'
        ]

class VendorListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for vendor listings"""
    gas_products_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Vendor
        fields = [
            'id', 'business_name', 'business_type', 'city', 'address',
            'contact_number', 'average_rating', 'total_reviews', 'is_verified',
            'gas_products_count', 'delivery_radius_km', 'delivery_fee'
        ]
    
    def get_gas_products_count(self, obj):
        return obj.gas_products.count()

class VendorDashboardSerializer(serializers.ModelSerializer):
    """Serializer for vendor dashboard with product statistics"""
    total_products = serializers.SerializerMethodField()
    available_products = serializers.SerializerMethodField()
    low_stock_products = serializers.SerializerMethodField()
    out_of_stock_products = serializers.SerializerMethodField()
    
    # New financial fields
    total_earnings = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    available_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    pending_payouts = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_orders_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Vendor
        fields = [
            'id', 'business_name', 'total_products', 'available_products',
            'low_stock_products', 'out_of_stock_products', 'average_rating',
            'total_reviews', 'is_verified', 'total_earnings', 'available_balance',
            'pending_payouts', 'total_orders_count'
        ]
    
    def get_total_products(self, obj):
        return obj.gas_products.count()
    
    def get_available_products(self, obj):
        return obj.gas_products.filter(stock_quantity__gt=0, is_active=True).count()
    
    def get_low_stock_products(self, obj):
        return obj.gas_products.filter(
            stock_quantity__gt=0, 
            stock_quantity__lte=models.F('min_stock_alert'),
            is_active=True
        ).count()
    
    def get_out_of_stock_products(self, obj):
        return obj.gas_products.filter(stock_quantity=0, is_active=True).count()

class VendorCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            'business_name', 'business_type', 'description', 'latitude', 'longitude',
            'address', 'city', 'country', 'contact_number', 'email', 'website',
            'delivery_radius_km', 'min_order_amount', 'delivery_fee'
        ]

class VendorUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            'business_name', 'description', 'latitude', 'longitude', 'address',
            'city', 'contact_number', 'email', 'website', 'opening_hours',
            'delivery_radius_km', 'min_order_amount', 'delivery_fee',
            'dashboard_layout', 'notification_preferences'
        ]

class VendorMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for basic vendor info"""
    class Meta:
        model = Vendor
        fields = [
            'id', 'business_name', 'business_type', 'description',
            'latitude', 'longitude', 'address', 'city', 'country',
            'contact_number', 'email', 'is_verified', 'is_active',
            'average_rating', 'total_reviews'
        ]

class GasProductDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for individual gas product pages"""
    vendor_name = serializers.CharField(source='vendor.business_name', read_only=True)
    vendor_address = serializers.CharField(source='vendor.address', read_only=True)
    vendor_contact = serializers.CharField(source='vendor.contact_number', read_only=True)
    vendor_city = serializers.CharField(source='vendor.city', read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    low_stock = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = GasProduct
        fields = [
            'id', 'name', 'gas_type', 'cylinder_size', 'brand',
            'price_with_cylinder', 'price_without_cylinder', 'stock_quantity',
            'min_stock_alert', 'description', 'ingredients', 'safety_instructions',
            'is_available', 'is_active', 'featured', 'in_stock', 'low_stock',
            'vendor_name', 'vendor_address', 'vendor_contact', 'vendor_city',
            'created_at', 'updated_at'
        ]