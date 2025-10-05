# vendors/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()

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
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.business_name} ({self.get_business_type_display()})"
    
    class Meta:
        ordering = ['-created_at']

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