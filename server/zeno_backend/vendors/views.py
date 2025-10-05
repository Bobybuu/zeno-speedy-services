# vendors/views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Vendor, VendorReview, OperatingHours
from .serializers import (
    VendorSerializer, VendorCreateSerializer, VendorUpdateSerializer,
    VendorReviewSerializer, OperatingHoursSerializer
)

class IsVendorOwner(permissions.BasePermission):
    """Custom permission to only allow vendor owners to edit their vendor profile"""
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.filter(is_active=True).select_related('user')
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['business_type', 'city', 'is_verified']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VendorCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return VendorUpdateSerializer
        return VendorSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['my_vendor', 'vendor_dashboard']:
            return [permissions.IsAuthenticated(), IsVendorOwner()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        # Check if user already has a vendor profile
        if hasattr(self.request.user, 'vendor_profile'):
            raise PermissionError("User already has a vendor profile")
        
        # Check if user is vendor type
        if self.request.user.user_type not in ['vendor', 'mechanic']:
            raise PermissionError("Only vendor or mechanic users can create vendor profiles")
        
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'])
    def my_vendor(self, request):
        """Get the current user's vendor profile"""
        try:
            vendor = request.user.vendor_profile
            serializer = self.get_serializer(vendor)
            return Response(serializer.data)
        except Vendor.DoesNotExist:
            return Response(
                {'error': 'You do not have a vendor profile'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def vendor_dashboard(self, request, pk=None):
        """Vendor dashboard with stats"""
        vendor = self.get_object()
        
        # Basic dashboard data
        dashboard_data = {
            'vendor': VendorSerializer(vendor).data,
            'total_services': vendor.services.count(),
            'active_services': vendor.services.filter(available=True).count(),
            'total_orders': vendor.orders.count(),  # Assuming you have orders app
            'pending_orders': vendor.orders.filter(status='pending').count(),
            'revenue': 0,  # Calculate from completed orders
        }
        
        return Response(dashboard_data)

class VendorReviewViewSet(viewsets.ModelViewSet):
    queryset = VendorReview.objects.all().select_related('customer', 'vendor')
    serializer_class = VendorReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def perform_create(self, serializer):
        serializer.save(customer=self.request.user)

    @action(detail=True, methods=['get'])
    def vendor_reviews(self, request, pk=None):
        """Get reviews for a specific vendor"""
        vendor_reviews = VendorReview.objects.filter(vendor_id=pk)
        serializer = self.get_serializer(vendor_reviews, many=True)
        return Response(serializer.data)