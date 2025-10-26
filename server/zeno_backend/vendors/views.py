# vendors/views.py
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Avg, F, Sum, When, Case, IntegerField
from django.shortcuts import get_object_or_404
from django.db import models
from django.utils import timezone
from datetime import timedelta
import json

from .models import (
    Vendor, VendorReview, OperatingHours, GasProduct, GasProductImage, 
    GasPriceHistory, VendorPayoutPreference, VendorEarning, PayoutTransaction, 
    VendorPerformance
)
from .serializers import (
    VendorSerializer, VendorCreateSerializer, VendorUpdateSerializer,
    VendorReviewSerializer, OperatingHoursSerializer,
    GasProductSerializer, GasProductCreateSerializer, GasProductUpdateSerializer,
    GasProductStockUpdateSerializer, VendorDashboardSerializer,
    VendorListSerializer, VendorWithProductsSerializer,
    GasProductListSerializer, GasProductImageSerializer,
    # NEW SERIALIZERS
    VendorPayoutPreferenceSerializer, VendorEarningSerializer,
    PayoutTransactionSerializer, VendorPerformanceSerializer,
    VendorDashboardAnalyticsSerializer, VendorOrderAnalyticsSerializer,
    VendorPayoutHistorySerializer
)

class IsVendorOwner(permissions.BasePermission):
    """Custom permission to only allow vendor owners to edit their vendor profile"""
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'vendor'):
            return obj.vendor.user == request.user
        elif hasattr(obj, 'payout_preference'):
            return obj.vendor.user == request.user
        return False

class IsVendorOrReadOnly(permissions.BasePermission):
    """Allow vendors to edit their own products, others can only view"""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.user_type in ['vendor', 'mechanic']

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.filter(is_active=True).select_related('user').prefetch_related(
        'operating_hours', 'reviews', 'gas_products', 'payout_preference', 'performance'
    )
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['business_type', 'city', 'is_verified']
    search_fields = ['business_name', 'city', 'address', 'description']
    ordering_fields = ['average_rating', 'created_at', 'business_name']
    ordering = ['-average_rating']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return VendorCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return VendorUpdateSerializer
        elif self.action == 'list':
            return VendorListSerializer
        elif self.action == 'vendor_with_products':
            return VendorWithProductsSerializer
        elif self.action == 'vendor_dashboard_analytics':
            return VendorDashboardAnalyticsSerializer
        return VendorSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated()]
        elif self.action in ['my_vendor', 'vendor_dashboard', 'vendor_dashboard_analytics', 
                           'my_products', 'vendor_stats', 'payout_preferences', 
                           'earnings', 'payout_history', 'order_analytics', 
                           'update_performance_metrics']:
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
        """Vendor dashboard with comprehensive stats"""
        vendor = self.get_object()
        
        # Gas product statistics
        gas_products = vendor.gas_products.all()
        total_products = gas_products.count()
        available_products = gas_products.filter(stock_quantity__gt=0).count()
        low_stock_products = gas_products.filter(
            stock_quantity__gt=0, 
            stock_quantity__lte=models.F('min_stock_alert')
        ).count()
        out_of_stock_products = gas_products.filter(stock_quantity=0).count()
        
        # Service statistics
        total_services = vendor.services.count()
        available_services = vendor.services.filter(available=True).count()
        
        # Order statistics
        from orders.models import Order
        total_orders = Order.objects.filter(vendor=vendor).count()
        pending_orders = Order.objects.filter(vendor=vendor, status='pending').count()
        completed_orders = Order.objects.filter(vendor=vendor, status='completed').count()
        
        # Financial statistics
        total_earnings = vendor.earnings.filter(status='paid').aggregate(
            total=Sum('net_amount')
        )['total'] or 0
        
        pending_payouts = vendor.earnings.filter(status='processed').aggregate(
            total=Sum('net_amount')
        )['total'] or 0
        
        dashboard_data = {
            'vendor': VendorDashboardSerializer(vendor).data,
            'gas_products_stats': {
                'total_products': total_products,
                'available_products': available_products,
                'low_stock_products': low_stock_products,
                'out_of_stock_products': out_of_stock_products,
            },
            'services_stats': {
                'total_services': total_services,
                'available_services': available_services,
            },
            'orders_stats': {
                'total_orders': total_orders,
                'pending_orders': pending_orders,
                'completed_orders': completed_orders,
            },
            'financial_stats': {
                'total_earnings': float(total_earnings),
                'available_balance': float(vendor.available_balance),
                'pending_payouts': float(pending_payouts),
                'total_paid_out': float(vendor.total_paid_out),
                'currency': 'KES'
            },
            'recent_activity': self._get_recent_activity(vendor)
        }
        
        return Response(dashboard_data)

    def _get_recent_activity(self, vendor):
        """Get recent activity for vendor dashboard"""
        recent_orders = vendor.orders.all().order_by('-created_at')[:5]
        recent_earnings = vendor.earnings.all().order_by('-created_at')[:5]
        recent_reviews = vendor.reviews.all().order_by('-created_at')[:5]
        
        return {
            'recent_orders': [
                {
                    'id': order.id,
                    'customer': order.customer.get_full_name() or order.customer.username,
                    'total_amount': float(order.total_amount),
                    'status': order.status,
                    'created_at': order.created_at
                } for order in recent_orders
            ],
            'recent_earnings': [
                {
                    'id': earning.id,
                    'amount': float(earning.net_amount),
                    'type': earning.earning_type,
                    'status': earning.status,
                    'created_at': earning.created_at
                } for earning in recent_earnings
            ],
            'recent_reviews': [
                {
                    'id': review.id,
                    'customer': review.customer.get_full_name() or review.customer.username,
                    'rating': review.rating,
                    'comment': review.comment[:100] + '...' if len(review.comment) > 100 else review.comment,
                    'created_at': review.created_at
                } for review in recent_reviews
            ]
        }

    @action(detail=True, methods=['get'])
    def vendor_dashboard_analytics(self, request, pk=None):
        """Comprehensive vendor dashboard analytics"""
        vendor = self.get_object()
        serializer = VendorDashboardAnalyticsSerializer(vendor)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def order_analytics(self, request, pk=None):
        """Vendor order analytics with time-based data"""
        vendor = self.get_object()
        date_period = request.query_params.get('period', '7d')  # 7d, 30d, 90d
        
        # Calculate date range
        end_date = timezone.now()
        if date_period == '7d':
            start_date = end_date - timedelta(days=7)
        elif date_period == '30d':
            start_date = end_date - timedelta(days=30)
        else:  # 90d
            start_date = end_date - timedelta(days=90)
        
        from orders.models import Order
        # Order statistics
        orders = Order.objects.filter(vendor=vendor, created_at__range=[start_date, end_date])
        
        order_stats = orders.aggregate(
            total_orders=Count('id'),
            pending_orders=Count('id', filter=Q(status='pending')),
            completed_orders=Count('id', filter=Q(status='completed')),
            cancelled_orders=Count('id', filter=Q(status='cancelled')),
            total_revenue=Sum('total_amount'),
            avg_order_value=Avg('total_amount')
        )
        
        # Financial stats from earnings
        earnings = vendor.earnings.filter(
            created_at__range=[start_date, end_date],
            earning_type='order'
        ).aggregate(
            total_commission=Sum('commission_amount'),
            net_earnings=Sum('net_amount')
        )
        
        # Daily orders for chart
        daily_orders = orders.extra(
            {'date_created': "date(created_at)"}
        ).values('date_created').annotate(
            count=Count('id')
        ).order_by('date_created')
        
        analytics_data = {
            'date_period': date_period,
            'total_orders': order_stats['total_orders'] or 0,
            'pending_orders': order_stats['pending_orders'] or 0,
            'completed_orders': order_stats['completed_orders'] or 0,
            'cancelled_orders': order_stats['cancelled_orders'] or 0,
            'total_revenue': float(order_stats['total_revenue'] or 0),
            'total_commission': float(earnings['total_commission'] or 0),
            'net_earnings': float(earnings['net_earnings'] or 0),
            'average_order_value': float(order_stats['avg_order_value'] or 0),
            'order_completion_rate': (
                (order_stats['completed_orders'] / order_stats['total_orders'] * 100) 
                if order_stats['total_orders'] else 0
            ),
            'daily_orders': [
                {'date': item['date_created'], 'count': item['count']} 
                for item in daily_orders
            ]
        }
        
        return Response(analytics_data)

    @action(detail=True, methods=['post'])
    def update_performance_metrics(self, request, pk=None):
        """Update vendor performance metrics"""
        vendor = self.get_object()
        vendor.update_performance_metrics()
        
        return Response({
            'message': 'Performance metrics updated successfully',
            'performance': VendorPerformanceSerializer(vendor.performance).data
        })

    @action(detail=True, methods=['get', 'put'])
    def payout_preferences(self, request, pk=None):
        """Get or update vendor payout preferences"""
        vendor = self.get_object()
        
        if request.method == 'GET':
            payout_pref = getattr(vendor, 'payout_preference', None)
            if payout_pref:
                serializer = VendorPayoutPreferenceSerializer(payout_pref)
                return Response(serializer.data)
            return Response({'detail': 'Payout preferences not configured'}, 
                          status=status.HTTP_404_NOT_FOUND)
        
        elif request.method == 'PUT':
            payout_pref, created = VendorPayoutPreference.objects.get_or_create(vendor=vendor)
            serializer = VendorPayoutPreferenceSerializer(
                payout_pref, data=request.data, partial=True
            )
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def earnings(self, request, pk=None):
        """Get vendor earnings history"""
        vendor = self.get_object()
        
        # Filter parameters
        earning_type = request.query_params.get('type')
        status_filter = request.query_params.get('status')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        earnings = vendor.earnings.all()
        
        if earning_type:
            earnings = earnings.filter(earning_type=earning_type)
        if status_filter:
            earnings = earnings.filter(status=status_filter)
        if date_from:
            earnings = earnings.filter(created_at__gte=date_from)
        if date_to:
            earnings = earnings.filter(created_at__lte=date_to)
        
        page = self.paginate_queryset(earnings.order_by('-created_at'))
        if page is not None:
            serializer = VendorEarningSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = VendorEarningSerializer(earnings, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def payout_history(self, request, pk=None):
        """Get vendor payout history"""
        vendor = self.get_object()
        
        payouts = vendor.payouts.all().order_by('-initiated_at')
        
        page = self.paginate_queryset(payouts)
        if page is not None:
            serializer = VendorPayoutHistorySerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = VendorPayoutHistorySerializer(payouts, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def vendor_stats(self, request):
        """Get overall vendor statistics for current user"""
        if not request.user.is_authenticated or request.user.user_type not in ['vendor', 'mechanic']:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            vendor = request.user.vendor_profile
            
            # Gas products statistics
            total_products = vendor.gas_products.count()
            available_products = vendor.gas_products.filter(stock_quantity__gt=0).count()
            low_stock_products = vendor.gas_products.filter(
                stock_quantity__gt=0, 
                stock_quantity__lte=models.F('min_stock_alert')
            ).count()
            
            # Services statistics
            total_services = vendor.services.count()
            available_services = vendor.services.filter(available=True).count()
            
            # Order statistics
            from orders.models import Order
            total_orders = Order.objects.filter(vendor=vendor).count()
            pending_orders = Order.objects.filter(vendor=vendor, status='pending').count()
            completed_orders = Order.objects.filter(vendor=vendor, status='completed').count()
            
            # Financial statistics
            total_earnings = vendor.earnings.filter(status='paid').aggregate(
                total=Sum('net_amount')
            )['total'] or 0
            
            return Response({
                'gas_products': {
                    'total': total_products,
                    'available': available_products,
                    'low_stock': low_stock_products,
                },
                'services': {
                    'total': total_services,
                    'available': available_services,
                },
                'orders': {
                    'total': total_orders,
                    'pending': pending_orders,
                    'completed': completed_orders,
                },
                'financial': {
                    'total_earnings': float(total_earnings),
                    'available_balance': float(vendor.available_balance),
                    'pending_payouts': float(vendor.pending_payouts),
                    'total_paid_out': float(vendor.total_paid_out),
                    'currency': 'KES'
                },
                'ratings': {
                    'average': float(vendor.average_rating) if vendor.average_rating else 0,
                    'total_reviews': vendor.total_reviews
                }
            })
        except Vendor.DoesNotExist:
            return Response({'error': 'Vendor profile not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def nearby_vendors(self, request):
        """Get vendors near a specific location"""
        latitude = request.query_params.get('lat')
        longitude = request.query_params.get('lng')
        radius_km = request.query_params.get('radius', 10)  # Default 10km radius
        
        if not latitude or not longitude:
            return Response(
                {'error': 'Latitude and longitude parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Simple distance filtering (for production, use GeoDjango or PostGIS)
        vendors = Vendor.objects.filter(is_active=True, is_verified=True)
        
        # Filter by gas vendors specifically if requested
        business_type = request.query_params.get('business_type')
        if business_type:
            vendors = vendors.filter(business_type=business_type)
        
        serializer = VendorListSerializer(vendors, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def vendor_with_products(self, request, pk=None):
        """Get vendor details with their gas products"""
        vendor = self.get_object()
        serializer = VendorWithProductsSerializer(vendor)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def top_rated(self, request):
        """Get top-rated vendors"""
        top_vendors = Vendor.objects.filter(
            is_active=True, 
            is_verified=True, 
            average_rating__isnull=False
        ).order_by('-average_rating')[:10]  # Top 10 vendors
        
        serializer = VendorListSerializer(top_vendors, many=True)
        return Response(serializer.data)

# ========== NEW VIEWSETS FOR DASHBOARD MODELS ==========

class VendorPayoutPreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet for vendor payout preferences"""
    serializer_class = VendorPayoutPreferenceSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendorOwner]
    
    def get_queryset(self):
        return VendorPayoutPreference.objects.filter(vendor__user=self.request.user)
    
    def perform_create(self, serializer):
        vendor = get_object_or_404(Vendor, user=self.request.user)
        serializer.save(vendor=vendor)

class VendorEarningViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for vendor earnings (read-only)"""
    serializer_class = VendorEarningSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendorOwner]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['earning_type', 'status']
    ordering_fields = ['created_at', 'net_amount']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return VendorEarning.objects.filter(vendor__user=self.request.user)

class PayoutTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for payout transactions (read-only)"""
    serializer_class = PayoutTransactionSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendorOwner]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'payout_method']
    ordering_fields = ['initiated_at', 'amount']
    ordering = ['-initiated_at']
    
    def get_queryset(self):
        return PayoutTransaction.objects.filter(vendor__user=self.request.user)

# ========== EXISTING VIEWSETS (UPDATED WITH NEW IMPORTS) ==========

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

class GasProductViewSet(viewsets.ModelViewSet):
    """Fixed GasProductViewSet with proper error handling"""
    queryset = GasProduct.objects.filter(is_active=True, is_available=True)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['gas_type', 'cylinder_size', 'vendor', 'is_available', 'featured']
    search_fields = ['name', 'brand', 'vendor__business_name', 'description']
    ordering_fields = ['price_with_cylinder', 'price_without_cylinder', 'created_at', 'name']
    ordering = ['-featured', 'name']
    
    def get_queryset(self):
        """Safe queryset method that won't cause 500 errors"""
        try:
            queryset = GasProduct.objects.filter(
                is_active=True, 
                is_available=True
            )
            
            vendor_verified = self.request.query_params.get('vendor__is_verified')
            if vendor_verified and vendor_verified.lower() == 'true':
                queryset = queryset.filter(vendor__is_verified=True)
            
            if self.action in ['my_products']:
                if self.request.user.is_authenticated:
                    queryset = queryset.filter(vendor__user=self.request.user)
            
            return queryset
            
        except Exception as e:
            print(f"ERROR in GasProductViewSet.get_queryset: {e}")
            return GasProduct.objects.filter(is_active=True, is_available=True)[:10]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return GasProductCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return GasProductUpdateSerializer
        elif self.action == 'update_stock':
            return GasProductStockUpdateSerializer
        elif self.action == 'list':
            return GasProductListSerializer
        return GasProductSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'update_stock', 'my_products']:
            return [permissions.IsAuthenticated(), IsVendorOwner()]
        return [permissions.AllowAny()]

    def perform_create(self, serializer):
        vendor = get_object_or_404(Vendor, user=self.request.user)
        serializer.save(vendor=vendor)

    @action(detail=False, methods=['get'])
    def my_products(self, request):
        """Get current vendor's gas products"""
        try:
            vendor = get_object_or_404(Vendor, user=request.user)
            products = vendor.gas_products.filter(is_active=True)
            
            page = self.paginate_queryset(products)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
                
            serializer = self.get_serializer(products, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Error fetching products: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['patch'])
    def update_stock(self, request, pk=None):
        """Update product stock quantity"""
        try:
            product = self.get_object()
            serializer = GasProductStockUpdateSerializer(product, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {'error': f'Error updating stock: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def toggle_availability(self, request, pk=None):
        """Toggle product availability"""
        try:
            product = self.get_object()
            product.is_available = not product.is_available
            product.save()
            
            return Response({
                'id': product.id,
                'is_available': product.is_available,
                'message': f'Product {"available" if product.is_available else "unavailable"}'
            })
        except Exception as e:
            return Response(
                {'error': f'Error toggling availability: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def featured_products(self, request):
        """Get featured gas products"""
        try:
            featured_products = GasProduct.objects.filter(
                featured=True, 
                is_available=True, 
                is_active=True
            )[:12]
            
            serializer = GasProductListSerializer(featured_products, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Error fetching featured products: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def search_products(self, request):
        """Search products by various criteria"""
        try:
            queryset = self.filter_queryset(self.get_queryset())
            
            min_price = request.query_params.get('min_price')
            max_price = request.query_params.get('max_price')
            city = request.query_params.get('city')
            
            if min_price:
                queryset = queryset.filter(price_with_cylinder__gte=min_price)
            if max_price:
                queryset = queryset.filter(price_with_cylinder__lte=max_price)
            if city:
                queryset = queryset.filter(vendor__city__iexact=city)
            
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
                
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Error searching products: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class GasProductImageViewSet(viewsets.ModelViewSet):
    queryset = GasProductImage.objects.all()
    serializer_class = GasProductImageSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendorOwner]

    def perform_create(self, serializer):
        product_id = self.request.data.get('product')
        product = get_object_or_404(GasProduct, id=product_id)
        
        if product.vendor.user != self.request.user:
            raise permissions.PermissionDenied("You don't have permission to add images to this product")
        
        serializer.save()

    @action(detail=True, methods=['post'])
    def set_primary(self, request, pk=None):
        """Set an image as primary for the product"""
        image = self.get_object()
        
        GasProductImage.objects.filter(product=image.product).update(is_primary=False)
        image.is_primary = True
        image.save()
        
        return Response({'message': 'Primary image updated successfully'})

class OperatingHoursViewSet(viewsets.ModelViewSet):
    serializer_class = OperatingHoursSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendorOwner]
    
    def get_queryset(self):
        return OperatingHours.objects.filter(vendor__user=self.request.user)

    def perform_create(self, serializer):
        vendor = get_object_or_404(Vendor, user=self.request.user)
        serializer.save(vendor=vendor)

# Debug endpoint
@api_view(['GET'])
def debug_gas_products(request):
    """Debug endpoint to test gas products without filters"""
    try:
        products = GasProduct.objects.all()[:5]
        filtered_products = GasProduct.objects.filter(
            is_active=True, 
            is_available=True
        )[:5]
        verified_products = GasProduct.objects.filter(
            is_active=True, 
            is_available=True,
            vendor__is_verified=True
        )[:5]
        
        serializer = GasProductListSerializer(verified_products, many=True)
        return Response({
            'success': True,
            'count': verified_products.count(),
            'products': serializer.data,
            'message': 'Debug endpoint working'
        })
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"DEBUG ERROR: {error_details}")
        return Response({
            'success': False,
            'error': str(e),
            'traceback': error_details
        }, status=500)