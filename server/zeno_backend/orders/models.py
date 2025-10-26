# orders/models.py - COMPLETE FIXED VERSION
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.db.models import Avg, Sum, F 

User = get_user_model()

class Cart(models.Model):
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='cart'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_amount(self):
        return sum(item.total_price for item in self.items.all())

    @property
    def item_count(self):
        return self.items.count()

    def __str__(self):
        return f"Cart for {self.user.username}"

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=20, choices=[
        ('service', 'Service'),
        ('gas_product', 'Gas Product')
    ], default='service')
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE, 
                               null=True, blank=True)
    gas_product = models.ForeignKey('vendors.GasProduct', on_delete=models.CASCADE,
                                   null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    added_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        # ✅ AUTO-SET item_type based on what's being added
        if self.gas_product and not self.service:
            self.item_type = 'gas_product'
        elif self.service and not self.gas_product:
            self.item_type = 'service'
            
        super().save(*args, **kwargs)
    
    @property
    def unit_price(self):
        if self.service:
            return self.service.price
        elif self.gas_product:
            return self.gas_product.price_with_cylinder
        return 0
    
    @property
    def total_price(self):
        return self.unit_price * self.quantity
    
    @property
    def item_name(self):
        if self.service:
            return self.service.name
        elif self.gas_product:
            return self.gas_product.name
        return "Unknown Item"
    
    @property
    def vendor(self):
        """Get the vendor for this cart item"""
        if self.service:
            return self.service.vendor
        elif self.gas_product:
            return self.gas_product.vendor
        return None
    
    class Meta:
        unique_together = ['cart', 'service', 'gas_product']

class Order(models.Model):
    ORDER_TYPES = [
        ('service', 'Service'),
        ('gas_product', 'Gas Product'),
        ('mixed', 'Mixed Order'),
    ]
    
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    vendor = models.ForeignKey('vendors.Vendor', on_delete=models.CASCADE, related_name='orders')
    order_type = models.CharField(max_length=20, choices=ORDER_TYPES, default='service')
    
    # Service-specific fields
    service = models.ForeignKey('services.Service', on_delete=models.SET_NULL, 
                               null=True, blank=True, related_name='orders')
    
    # Gas product-specific fields
    gas_product = models.ForeignKey('vendors.GasProduct', on_delete=models.SET_NULL,
                                   null=True, blank=True, related_name='orders')
    
    # Common fields
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    
    # Delivery information
    delivery_type = models.CharField(max_length=20, choices=[
        ('delivery', 'Delivery'),
        ('pickup', 'Pickup'),
        ('on_site', 'On-Site Service')
    ], default='delivery')
    
    location_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_address = models.TextField()
    special_instructions = models.TextField(blank=True)
    
    # Status fields
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('failed', 'Failed')
    ], default='pending')
    
    payment_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded')
    ], default='pending')
    
    # ========== NEW FIELDS FOR VENDOR DASHBOARD INTEGRATION ==========
    # Commission tracking
    commission_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=10.00,
        validators=[MinValueValidator(0)],
        help_text="Commission rate applied to this order"
    )
    
    # Vendor earnings tracking
    vendor_earnings = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)],
        help_text="Amount vendor earns after commission"
    )
    
    # Order priority for vendors
    priority = models.CharField(max_length=20, choices=[
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent')
    ], default='normal')
    
    # Customer contact information for vendors
    customer_phone = models.CharField(max_length=15, blank=True)
    customer_email = models.EmailField(blank=True)
    
    # Estimated completion time (for vendor planning)
    estimated_completion_time = models.DurationField(null=True, blank=True)
    # ========== END NEW FIELDS ==========
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        # Auto-calculate total amount if not set
        if not self.total_amount and self.unit_price:
            self.total_amount = self.unit_price * self.quantity
        
        # Auto-calculate vendor earnings if not set
        if not self.vendor_earnings and self.total_amount and self.commission_rate:
            commission_amount = (self.total_amount * self.commission_rate) / 100
            self.vendor_earnings = self.total_amount - commission_amount
        
        # Set timestamps based on status changes
        if self.status == 'confirmed' and not self.confirmed_at:
            self.confirmed_at = timezone.now()
        elif self.status == 'completed' and not self.completed_at:
            self.completed_at = timezone.now()
            
            # Update vendor performance metrics
            if hasattr(self.vendor, 'performance'):
                self.vendor.performance.completed_orders += 1
                self.vendor.performance.last_order_date = timezone.now()
                self.vendor.performance.save()
        
        # Update customer contact info if not set
        if not self.customer_phone and self.customer.phone_number:
            self.customer_phone = self.customer.phone_number
        if not self.customer_email and self.customer.email:
            self.customer_email = self.customer.email
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Order #{self.id} - {self.customer.username}"
    
    # ========== NEW PROPERTIES FOR VENDOR DASHBOARD ==========
    @property
    def commission_amount(self):
        """✅ ADDED: Calculate commission amount for this order"""
        if self.total_amount and self.commission_rate:
            return (self.total_amount * self.commission_rate) / 100
        return 0
    
    @property
    def is_ready_for_payment(self):
        """Check if order is ready for payment processing"""
        return self.status in ['confirmed', 'in_progress'] and self.payment_status == 'pending'
    
    @property
    def can_be_completed(self):
        """Check if order can be marked as completed"""
        return self.status in ['confirmed', 'in_progress'] and self.payment_status == 'paid'
    
    @property
    def time_since_created(self):
        """Get time elapsed since order creation"""
        return timezone.now() - self.created_at
    
    @property
    def estimated_completion_date(self):
        """Get estimated completion date"""
        if self.estimated_completion_time:
            return self.created_at + self.estimated_completion_time
        return None
    
    # ✅ CRITICAL FIX: COMPLETELY UPDATED update_vendor_performance METHOD
    def update_vendor_performance(self):
        """Update vendor performance metrics for this order"""
        if hasattr(self.vendor, 'performance'):
            performance = self.vendor.performance
            performance.total_orders = self.vendor.orders.count()
            performance.completed_orders = self.vendor.orders.filter(status='completed').count()
            performance.cancelled_orders = self.vendor.orders.filter(status='cancelled').count()
            
            # Calculate average order value
            avg_value = self.vendor.orders.aggregate(avg=Avg('total_amount'))['avg'] or 0
            performance.average_order_value = avg_value
            
            # ✅ FIXED: Use only existing fields - no more 'commission_amount' field reference
            completed_orders = self.vendor.orders.filter(status='completed')
            
            # ✅ FIXED: Use 'total_amount' field that exists
            performance.total_revenue = completed_orders.aggregate(total=Sum('total_amount'))['total'] or 0
            
            # ✅ FIXED: Use 'vendor_earnings' field that exists  
            performance.total_earnings = completed_orders.aggregate(total=Sum('vendor_earnings'))['total'] or 0
            
            # ✅ CRITICAL FIX: Calculate commission using commission_rate instead of commission_amount
            # Use F expressions to calculate commission on the database level
            performance.total_commission = completed_orders.aggregate(
                total=Sum(F('total_amount') * F('commission_rate') / 100)
            )['total'] or 0
            
            performance.save()
    # ========== END NEW PROPERTIES ==========
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['vendor', 'status']),
            models.Index(fields=['customer', 'created_at']),
            models.Index(fields=['status', 'payment_status']),
        ]

class OrderItem(models.Model):
    """For mixed orders containing both services and products"""
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=20, choices=[
        ('service', 'Service'),
        ('gas_product', 'Gas Product')
    ])
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE, 
                               null=True, blank=True)
    gas_product = models.ForeignKey('vendors.GasProduct', on_delete=models.CASCADE,
                                   null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    total_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    
    def save(self, *args, **kwargs):
        # ✅ AUTO-SET item_type for OrderItem as well
        if self.gas_product and not self.service:
            self.item_type = 'gas_product'
        elif self.service and not self.gas_product:
            self.item_type = 'service'
            
        if self.unit_price and self.quantity:
            self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.item_type} - Order #{self.order.id}"
    
    @property
    def item_name(self):
        if self.item_type == 'service' and self.service:
            return self.service.name
        elif self.item_type == 'gas_product' and self.gas_product:
            return self.gas_product.name
        return "Unknown Item"
    
    @property
    def vendor(self):
        """Get the vendor for this order item"""
        if self.item_type == 'service' and self.service:
            return self.service.vendor
        elif self.item_type == 'gas_product' and self.gas_product:
            return self.gas_product.vendor
        return None

class OrderTracking(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='tracking')
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('failed', 'Failed')
    ])
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Tracking - Order #{self.order.id} - {self.status}"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['order', 'created_at']),
        ]