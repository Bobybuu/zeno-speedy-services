# payments/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils import timezone

User = get_user_model()

class Payment(models.Model):
    PAYMENT_METHODS = (
        ('mpesa', 'M-Pesa'),
        ('card', 'Credit Card'),
        ('cash', 'Cash on Delivery'),
    )
    
    PAYMENT_STATUS = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    )
    
    order = models.OneToOneField('orders.Order', on_delete=models.CASCADE, related_name='payment')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    
    # Payment details
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    currency = models.CharField(max_length=3, default='KES')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='mpesa')
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='pending')
    
    # ========== NEW COMMISSION TRACKING FIELDS ==========
    commission_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=10.00,
        validators=[MinValueValidator(0)],
        help_text="Zeno commission rate percentage"
    )
    commission_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)],
        help_text="Zeno commission amount"
    )
    vendor_earnings = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        validators=[MinValueValidator(0)],
        help_text="Vendor's share after commission"
    )
    
    # Payout tracking
    payout_status = models.CharField(
        max_length=20,
        choices=(
            ('pending', 'Pending Payout'),
            ('processed', 'Processed for Payout'),
            ('paid', 'Paid to Vendor'),
        ),
        default='pending',
        help_text="Status of vendor payout for this payment"
    )
    
    # Vendor earnings reference
    vendor_earning = models.OneToOneField(
        'vendors.VendorEarning', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='payment_reference',
        help_text="Linked vendor earning record"
    )
    # ========== END NEW FIELDS ==========
    
    # M-Pesa specific fields
    mpesa_receipt_number = models.CharField(max_length=50, blank=True)
    phone_number = models.CharField(max_length=15)
    transaction_date = models.DateTimeField(null=True, blank=True)
    
    # Generic payment fields
    transaction_id = models.CharField(max_length=100, blank=True)
    payment_gateway_response = models.JSONField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Payment #{self.id} - {self.amount} {self.currency}"
    
    def save(self, *args, **kwargs):
        # Auto-calculate commission and vendor earnings if not set
        if self.amount and not self.commission_amount:
            self.commission_amount = (self.amount * self.commission_rate) / 100
        
        if self.amount and self.commission_amount and not self.vendor_earnings:
            self.vendor_earnings = self.amount - self.commission_amount
        
        # Create vendor earning record when payment is completed
        if self.status == 'completed' and self.payout_status == 'pending' and not self.vendor_earning:
            self._create_vendor_earning()
        
        super().save(*args, **kwargs)
    
    def _create_vendor_earning(self):
        """Create vendor earning record when payment is completed"""
        from vendors.models import VendorEarning
        
        if self.order.vendor:
            vendor_earning = VendorEarning.objects.create(
                vendor=self.order.vendor,
                order=self.order,
                payment=self,
                earning_type='order',
                gross_amount=self.amount,
                commission_rate=self.commission_rate,
                commission_amount=self.commission_amount,
                net_amount=self.vendor_earnings,
                status='pending',
                description=f"Payment for order #{self.order.id}"
            )
            self.vendor_earning = vendor_earning
            self.payout_status = 'processed'
    
    @property
    def is_commission_calculated(self):
        """Check if commission has been calculated"""
        return self.commission_amount > 0 and self.vendor_earnings > 0
    
    @property
    def vendor_payout_ready(self):
        """Check if payment is ready for vendor payout"""
        return (self.status == 'completed' and 
                self.payout_status == 'processed' and 
                self.vendor_earning is not None)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'payout_status']),
            models.Index(fields=['order', 'vendor_earning']),
        ]


class MpesaConfiguration(models.Model):
    """Store M-Pesa API configuration"""
    environment = models.CharField(max_length=10, choices=(
        ('sandbox', 'Sandbox'),
        ('production', 'Production'),
    ), default='sandbox')
    consumer_key = models.CharField(max_length=255)
    consumer_secret = models.CharField(max_length=255)
    shortcode = models.CharField(max_length=20)
    passkey = models.CharField(max_length=255)
    callback_url = models.URLField()
    is_active = models.BooleanField(default=True)
    
    # ========== NEW COMMISSION SETTINGS ==========
    default_commission_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=10.00,
        validators=[MinValueValidator(0)],
        help_text="Default commission rate for vendors (%)"
    )
    
    # Payout settings
    auto_process_payouts = models.BooleanField(
        default=True,
        help_text="Automatically process vendor payouts when payments complete"
    )
    payout_processing_fee = models.DecimalField(
        max_digits=10, decimal_places=2, default=0.00,
        help_text="Fixed fee for processing payouts (KES)"
    )
    # ========== END NEW FIELDS ==========
    
    def __str__(self):
        return f"M-Pesa {self.environment} Configuration"
    
    class Meta:
        verbose_name_plural = "M-Pesa Configurations"


class PayoutRequest(models.Model):
    """Model for vendor payout requests (manual payouts)"""
    PAYOUT_METHODS = (
        ('mpesa', 'M-Pesa'),
        ('bank_transfer', 'Bank Transfer'),
        # Other methods can be added later
    )
    
    PAYOUT_STATUS = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
        ('failed', 'Failed'),
    )
    
    vendor = models.ForeignKey('vendors.Vendor', on_delete=models.CASCADE, related_name='payout_requests')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    payout_method = models.CharField(max_length=20, choices=PAYOUT_METHODS, default='mpesa')
    status = models.CharField(max_length=20, choices=PAYOUT_STATUS, default='pending')
    
    # Payout details
    recipient_number = models.CharField(max_length=15, help_text="M-Pesa number for payout")
    recipient_name = models.CharField(max_length=255, blank=True)
    
    # Processing information
    admin_notes = models.TextField(blank=True, help_text="Admin notes for payout processing")
    processed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='processed_payouts'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Payout Request #{self.id} - {self.vendor.business_name} - {self.amount} KES"
    
    def save(self, *args, **kwargs):
        # Set processed timestamp when status changes to processing
        if self.status == 'processing' and not self.processed_at:
            self.processed_at = timezone.now()
        elif self.status == 'completed' and not self.completed_at:
            self.completed_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    @property
    def can_be_processed(self):
        """Check if payout request can be processed"""
        return (self.status == 'approved' and 
                self.vendor.available_balance >= self.amount)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Payout Request"
        verbose_name_plural = "Payout Requests"


class CommissionSummary(models.Model):
    """Model to track Zeno's commission earnings summary"""
    PERIOD_CHOICES = (
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('yearly', 'Yearly'),
    )
    
    period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Commission statistics
    total_payments = models.IntegerField(default=0)
    total_payment_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_commission_earned = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_vendor_payouts = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    
    # Vendor statistics
    active_vendors = models.IntegerField(default=0)
    vendors_with_payouts = models.IntegerField(default=0)
    
    # Calculated fields (for reporting)
    average_commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    commission_to_revenue_ratio = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Commission Summary - {self.get_period_type_display()} ({self.period_start} to {self.period_end})"
    
    def save(self, *args, **kwargs):
        # Calculate derived fields
        if self.total_payment_amount > 0:
            self.average_commission_rate = (self.total_commission_earned / self.total_payment_amount) * 100
            self.commission_to_revenue_ratio = (self.total_commission_earned / self.total_payment_amount) * 100
        
        super().save(*args, **kwargs)
    
    class Meta:
        verbose_name = "Commission Summary"
        verbose_name_plural = "Commission Summaries"
        unique_together = ['period_type', 'period_start', 'period_end']
        ordering = ['-period_start']


class PaymentWebhookLog(models.Model):
    """Model to log payment webhook calls for debugging"""
    WEBHOOK_TYPES = (
        ('mpesa_stk_push', 'M-Pesa STK Push'),
        ('mpesa_c2b', 'M-Pesa C2B'),
        ('mpesa_b2c', 'M-Pesa B2C'),
        ('card_webhook', 'Card Payment Webhook'),
    )
    
    webhook_type = models.CharField(max_length=20, choices=WEBHOOK_TYPES)
    payload = models.JSONField(help_text="Raw webhook payload")
    headers = models.JSONField(null=True, blank=True, help_text="Request headers")
    
    # Processing information
    processed_successfully = models.BooleanField(default=False)
    processing_notes = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    
    # Reference to related objects
    payment = models.ForeignKey(
        Payment, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='webhook_logs'
    )
    payout_transaction = models.ForeignKey(
        'vendors.PayoutTransaction', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='webhook_logs'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        status = "Success" if self.processed_successfully else "Failed"
        return f"{self.get_webhook_type_display()} Webhook - {status} - {self.created_at}"
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Payment Webhook Log"
        verbose_name_plural = "Payment Webhook Logs"