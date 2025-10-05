# vendors/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Vendor, VendorReview, OperatingHours

User = get_user_model()

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

class VendorSerializer(serializers.ModelSerializer):
    operating_hours = OperatingHoursSerializer(many=True, read_only=True)
    reviews = VendorReviewSerializer(many=True, read_only=True)
    owner_name = serializers.CharField(source='user.get_full_name', read_only=True)
    owner_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = Vendor
        fields = [
            'id', 'user', 'owner_name', 'owner_email', 'business_name', 'business_type',
            'description', 'latitude', 'longitude', 'address', 'city', 'country',
            'contact_number', 'email', 'website', 'opening_hours', 'is_verified',
            'is_active', 'average_rating', 'total_reviews', 'operating_hours',
            'reviews', 'created_at'
        ]
        read_only_fields = ['user', 'average_rating', 'total_reviews', 'is_verified']

class VendorCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            'business_name', 'business_type', 'description', 'latitude', 'longitude',
            'address', 'city', 'country', 'contact_number', 'email', 'website'
        ]

class VendorUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = [
            'business_name', 'description', 'latitude', 'longitude', 'address',
            'city', 'contact_number', 'email', 'website', 'opening_hours'
        ]