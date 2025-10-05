# vendors/admin.py
from django.contrib import admin
from .models import Vendor, VendorReview, OperatingHours

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ['business_name', 'business_type', 'city', 'is_verified', 'is_active']
    list_filter = ['business_type', 'is_verified', 'is_active', 'city']
    search_fields = ['business_name', 'user__email', 'contact_number']
    readonly_fields = ['created_at', 'updated_at', 'average_rating', 'total_reviews']
    actions = ['verify_vendors', 'unverify_vendors']
    
    def verify_vendors(self, request, queryset):
        queryset.update(is_verified=True)
    verify_vendors.short_description = "Mark selected vendors as verified"
    
    def unverify_vendors(self, request, queryset):
        queryset.update(is_verified=False)
    unverify_vendors.short_description = "Mark selected vendors as unverified"

@admin.register(VendorReview)
class VendorReviewAdmin(admin.ModelAdmin):
    list_display = ['vendor', 'customer', 'rating', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['vendor__business_name', 'customer__email']
    readonly_fields = ['created_at']

admin.site.register(OperatingHours)