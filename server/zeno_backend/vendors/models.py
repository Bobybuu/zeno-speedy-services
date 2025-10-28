# vendors/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

User = get_user_model()

class VendorPayoutPreference(models.Model):
    """Model for vendor payout preferences and methods"""
    PAYOUT_METHODS = (
        ('mpesa', 'M-Pesa'),
        ('bank_transfer', 'Bank Transfer'),
        ('cash', 'Cash Collection'),
        ('mobile_money', 'Other Mobile Money'),
    )
    
    BANK_TYPES = (
        ('commercial', 'Commercial Bank'),
        ('sacco', 'SACCO'),
        ('microfinance', 'Microfinance Bank'),
    )
    
    vendor = models.OneToOneField('Vendor', on_delete=models.CASCADE, related_name='payout_preference')
    
    # Payout Method
    payout_method = models.CharField(max_length=20, choices=PAYOUT_METHODS, default='mpesa')
    
    # M-Pesa/Mobile Money Details
    mobile_money_number = models.CharField(max_length=15, blank=True, help_text="Phone number for M-Pesa/Mobile Money")
    mobile_money_name = models.CharField(max_length=255, blank=True, help_text="Account holder name for mobile money")
    
    # Bank Transfer Details
    bank_name = models.CharField(max_length=255, blank=True)
    bank_type = models.CharField(max_length=20, choices=BANK_TYPES, blank=True)
    account_number = models.CharField(max_length=50, blank=True)
    account_name = models.CharField(max_length=255, blank=True)
    branch_code = models.CharField(max_length=20, blank=True)
    swift_code = models.CharField(max_length=20, blank=True)
    
    # Verification
    is_verified = models.BooleanField(default=False)
    verification_document = models.FileField(upload_to='payout_verification/', blank=True, null=True)
    
    # Settings
    auto_payout = models.BooleanField(default=True, help_text="Automatically process payouts when threshold is reached")
    payout_threshold = models.DecimalField(
        max_digits=10, decimal_places=2, default=1000.00,
        help_text="Minimum amount to trigger automatic payout"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Payout Preference - {self.vendor.business_name} ({self.get_payout_method_display()})"
    
    @property
    def payout_details_summary(self):
        """Get formatted payout details for display"""
        if self.payout_method == 'mpesa' and self.mobile_money_number:
            return f"M-Pesa: {self.mobile_money_number}"
        elif self.payout_method == 'bank_transfer' and self.account_number:
            return f"Bank: {self.bank_name} - {self.account_number}"
        elif self.payout_method == 'cash':
            return "Cash Collection"
        return "Not configured"
    
    class Meta:
        verbose_name = "Vendor Payout Preference"
        verbose_name_plural = "Vendor Payout Preferences"


class VendorEarning(models.Model):
    """Model to track vendor earnings and commissions"""
    EARNING_TYPES = (
        ('order', 'Order Payment'),
        ('refund', 'Refund'),
        ('adjustment', 'Manual Adjustment'),
        ('payout', 'Payout Deduction'),
    )
    
    vendor = models.ForeignKey('Vendor', on_delete=models.CASCADE, related_name='earnings')
    
    # ✅ FIXED: Added related_name to avoid conflict with Order.vendor_earnings field
    #order = models.ForeignKey(
        #'orders.Order', 
        #on_delete=models.SET_NULL, 
        #null=True, 
        #blank=True, 
        #related_name='vendor_earnings_relation'  # Changed from 'vendor_earnings'
    #)
    
    payment = models.ForeignKey('payments.Payment', on_delete=models.SET_NULL, null=True, blank=True, related_name='vendor_earnings_relation')
    
    # Earning Details
    earning_type = models.CharField(max_length=20, choices=EARNING_TYPES, default='order')
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    commission_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=10.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Commission percentage taken by Zeno"
    )
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    net_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    
    # Status
    status = models.CharField(max_length=20, choices=(
        ('pending', 'Pending'),
        ('processed', 'Processed'),
        ('paid', 'Paid to Vendor'),
        ('cancelled', 'Cancelled'),
    ), default='pending')
    
    # Payout Reference
    payout_transaction = models.ForeignKey('PayoutTransaction', on_delete=models.SET_NULL, null=True, blank=True, related_name='earnings')
    
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        # Auto-calculate commission and net amount if not set
        if not self.commission_amount and self.gross_amount and self.commission_rate:
            self.commission_amount = (self.gross_amount * self.commission_rate) / 100
        
        if not self.net_amount and self.gross_amount and self.commission_amount:
            self.net_amount = self.gross_amount - self.commission_amount
        
        # Set processed timestamp when status changes to processed
        if self.status == 'processed' and not self.processed_at:
            self.processed_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Earning #{self.id} - {self.vendor.business_name} - {self.net_amount} KES"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vendor', 'status']),
            models.Index(fields=['created_at']),
        ]


class PayoutTransaction(models.Model):
    """Model to track vendor payouts"""
    vendor = models.ForeignKey('Vendor', on_delete=models.CASCADE, related_name='payouts')
    
    # Payout Details
    payout_method = models.CharField(max_length=20, choices=VendorPayoutPreference.PAYOUT_METHODS)
    payout_reference = models.CharField(max_length=100, unique=True, help_text="External transaction reference")
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3, default='KES')
    
    # Status
    status = models.CharField(max_length=20, choices=(
        ('initiated', 'Initiated'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ), default='initiated')
    
    # Payout Details
    recipient_details = models.JSONField(default=dict, help_text="Recipient bank/mobile details")
    gateway_response = models.JSONField(null=True, blank=True, help_text="Response from payment gateway")
    
    # Timestamps
    initiated_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    description = models.TextField(blank=True)
    
    def __str__(self):
        return f"Payout #{self.payout_reference} - {self.vendor.business_name} - {self.amount} KES"
    
    def save(self, *args, **kwargs):
        # Set timestamps based on status
        if self.status == 'processing' and not self.processed_at:
            self.processed_at = timezone.now()
        elif self.status == 'completed' and not self.completed_at:
            self.completed_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-initiated_at']
        verbose_name = "Payout Transaction"
        verbose_name_plural = "Payout Transactions"


class VendorPerformance(models.Model):
    """Model to track vendor performance metrics"""
    vendor = models.OneToOneField('Vendor', on_delete=models.CASCADE, related_name='performance')
    
    # Order Metrics
    total_orders = models.IntegerField(default=0)
    completed_orders = models.IntegerField(default=0)
    cancelled_orders = models.IntegerField(default=0)
    average_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Revenue Metrics
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_commission = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Customer Metrics
    repeat_customers = models.IntegerField(default=0)
    customer_satisfaction_score = models.DecimalField(
        max_digits=3, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(5)]
    )
    
    # Performance Timestamps
    last_order_date = models.DateTimeField(null=True, blank=True)
    metrics_updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Performance - {self.vendor.business_name}"
    
    @property
    def completion_rate(self):
        """Calculate order completion rate"""
        if self.total_orders == 0:
            return 0
        return (self.completed_orders / self.total_orders) * 100
    
    @property
    def cancellation_rate(self):
        """Calculate order cancellation rate"""
        if self.total_orders == 0:
            return 0
        return (self.cancelled_orders / self.total_orders) * 100
    
    class Meta:
        verbose_name = "Vendor Performance"
        verbose_name_plural = "Vendor Performances"


class Vendor(models.Model):
    VENDOR_TYPES = (
        ('gas_station', 'Gas Station'),
        ('mechanic', 'Mechanic'),
        ('hospital', 'Hospital'),
        ('roadside_assistance', 'Roadside Assistance'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='vendor_profile')
    business_name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=50, choices=VENDOR_TYPES)
    description = models.TextField(blank=True)
    
    # Location details
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    address = models.TextField()
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default='Kenya')
    
    # Contact information
    contact_number = models.CharField(max_length=15)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    
    # Business details
    opening_hours = models.CharField(max_length=100, blank=True)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    # Ratings
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.IntegerField(default=0)
    
    # Gas-specific fields
    delivery_radius_km = models.IntegerField(default=5, help_text="Delivery radius in kilometers")
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # ========== NEW DASHBOARD FIELDS ==========
    # Commission & Payout Settings
    commission_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=10.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Default commission rate for this vendor"
    )
    
    # Financial Summary Fields (cached for performance)
    total_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Total earnings including pending")
    available_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Amount available for payout")
    pending_payouts = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Amount in pending payouts")
    total_paid_out = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, help_text="Total amount paid to vendor")
    
    # Performance Metrics (cached)
    total_orders_count = models.IntegerField(default=0)
    completed_orders_count = models.IntegerField(default=0)
    active_customers_count = models.IntegerField(default=0)
    
    # Dashboard Preferences
    dashboard_layout = models.JSONField(default=dict, blank=True, help_text="Vendor's dashboard layout preferences")
    notification_preferences = models.JSONField(default=dict, blank=True, help_text="Notification settings for vendor")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # ========== END NEW FIELDS ==========
    
    def __str__(self):
        return f"{self.business_name} ({self.get_business_type_display()})"
    
    @property
    def total_gas_products(self):
        return self.gas_products.filter(is_active=True).count()
    
    @property
    def available_gas_products(self):
        return self.gas_products.filter(is_active=True, stock_quantity__gt=0)
    
    # ========== NEW PROPERTIES ==========
    @property
    def has_payout_preference(self):
        """Check if vendor has configured payout preferences"""
        return hasattr(self, 'payout_preference') and self.payout_preference.is_verified
    
    @property
    def next_payout_amount(self):
        """Calculate next payout amount based on preferences"""
        if not self.has_payout_preference:
            return 0
        if self.payout_preference.auto_payout and self.available_balance >= self.payout_preference.payout_threshold:
            return self.available_balance
        return 0
    
    @property
    def order_completion_rate(self):
        """Calculate order completion rate"""
        if self.total_orders_count == 0:
            return 0
        return (self.completed_orders_count / self.total_orders_count) * 100
    
    @property
    def average_commission(self):
        """Calculate average commission per order"""
        if self.total_orders_count == 0:
            return 0
        return (self.total_earnings * (self.commission_rate / 100)) / self.total_orders_count
    
    def update_performance_metrics(self):
        """Update cached performance metrics"""
        from orders.models import Order
        from django.db.models import Count, Avg, Sum
        
        # Order metrics
        order_stats = Order.objects.filter(vendor=self).aggregate(
            total_orders=Count('id'),
            completed_orders=Count('id', filter=models.Q(status='completed')),
            avg_order_value=Avg('total_amount')
        )
        
        # Customer metrics
        unique_customers = Order.objects.filter(vendor=self).values('customer').distinct().count()
        
        # Update fields
        self.total_orders_count = order_stats['total_orders'] or 0
        self.completed_orders_count = order_stats['completed_orders'] or 0
        self.active_customers_count = unique_customers
        
        # Create or update performance record
        performance, created = VendorPerformance.objects.get_or_create(vendor=self)
        performance.total_orders = self.total_orders_count
        performance.completed_orders = self.completed_orders_count
        performance.average_order_value = order_stats['avg_order_value'] or 0
        performance.save()
    
    def save(self, *args, **kwargs):
        # Ensure commission rate is within valid range
        if self.commission_rate < 0:
            self.commission_rate = 0
        elif self.commission_rate > 100:
            self.commission_rate = 100
        
        # Create default payout preference if doesn't exist
        creating = self._state.adding
        super().save(*args, **kwargs)
        
        if creating:
            # Create default payout preference
            VendorPayoutPreference.objects.create(vendor=self)
            # Create performance record
            VendorPerformance.objects.create(vendor=self)
    # ========== END NEW PROPERTIES ==========
    
    class Meta:
        ordering = ['-created_at']




class GasProduct(models.Model):
    GAS_TYPES = (
        ('lpg', 'LPG (Cooking Gas)'),
        ('cng', 'CNG (Compressed Natural Gas)'),
        ('oxygen', 'Medical Oxygen'),
        ('nitrogen', 'Industrial Nitrogen'),
        ('acetylene', 'Acetylene'),
    )
    
    CYLINDER_SIZES = (
        ('1kg', '1 kg'),
        ('3kg', '3 kg'),
        ('5kg', '5 kg'),
        ('6kg', '6 kg'),
        ('13kg', '13 kg'),
        ('15kg', '15 kg'),
        ('22kg', '22 kg'),
        ('50kg', '50 kg'),
        ('100kg', '100 kg'),
    )
    
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='gas_products')
    
    # Product Identification
    name = models.CharField(max_length=200, help_text="e.g., Pro Gas LPG, K-Gas, etc.")
    gas_type = models.CharField(max_length=20, choices=GAS_TYPES, default='lpg')
    cylinder_size = models.CharField(max_length=10, choices=CYLINDER_SIZES, default='13kg')
    brand = models.CharField(max_length=100, blank=True)
    
    # Pricing
    price_with_cylinder = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Price including cylinder deposit"
    )
    price_without_cylinder = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Price for gas refill only (customer provides cylinder)"
    )
    cylinder_deposit = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0.00,
        help_text="Cylinder deposit amount"
    )
    
    # Inventory Management
    stock_quantity = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Current available stock"
    )
    min_stock_alert = models.IntegerField(
        default=5,
        validators=[MinValueValidator(0)],
        help_text="Alert when stock reaches this level"
    )
    
    # Product Details
    description = models.TextField(blank=True, help_text="Product features and specifications")
    ingredients = models.TextField(blank=True, help_text="Gas composition and purity")
    safety_instructions = models.TextField(blank=True)
    
    # Status & Visibility
    is_available = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.get_cylinder_size_display()} ({self.vendor.business_name})"
    
    @property
    def in_stock(self):
        return self.stock_quantity > 0
    
    @property
    def low_stock(self):
        return 0 < self.stock_quantity <= self.min_stock_alert
    
    def save(self, *args, **kwargs):
        # Auto-calculate cylinder deposit if not set
        #if not self.cylinder_deposit and self.price_with_cylinder and self.price_without_cylinder:
            #self.cylinder_deposit = self.price_with_cylinder - self.price_without_cylinder
        self.cylinder_deposit = 0.00  # Reset to 0 as per new requirement
        # Update availability based on stock
        self.is_available = self.in_stock and self.is_active
        
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['gas_type', 'cylinder_size', 'name']
        unique_together = ['vendor', 'gas_type', 'cylinder_size', 'brand']


class GasProductImage(models.Model):
    product = models.ForeignKey(GasProduct, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='gas_products/')
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Image for {self.product.name}"


class GasPriceHistory(models.Model):
    product = models.ForeignKey(GasProduct, on_delete=models.CASCADE, related_name='price_history')
    price_with_cylinder = models.DecimalField(max_digits=10, decimal_places=2)
    price_without_cylinder = models.DecimalField(max_digits=10, decimal_places=2)
    effective_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Price history for {self.product.name} on {self.effective_date.date()}"


class VendorReview(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='reviews')
    customer = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Review for {self.vendor.business_name} by {self.customer.username}"


class OperatingHours(models.Model):
    DAYS_OF_WEEK = (
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    )
    
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='operating_hours')
    day = models.IntegerField(choices=DAYS_OF_WEEK)
    opening_time = models.TimeField()
    closing_time = models.TimeField()
    is_closed = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.get_day_display()}: {self.opening_time} - {self.closing_time}"