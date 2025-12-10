# orders/views.py 
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count, Sum, Avg, Q
from datetime import timedelta

# Import Service model from services app
from services.models import Service
from vendors.models import Vendor, GasProduct

from .models import Order, OrderTracking, Cart, CartItem, OrderItem
from .serializers import (
    OrderSerializer, OrderDetailSerializer, CreateOrderSerializer, 
    CreateGasProductOrderSerializer, CreateMixedOrderSerializer, 
    UpdateOrderStatusSerializer, UpdateOrderPrioritySerializer,
    UpdateOrderCompletionTimeSerializer, VendorOrderSerializer,
    CartSerializer, CartItemSerializer, OrderTrackingSerializer,
    OrderAnalyticsSerializer, BulkOrderStatusUpdateSerializer
)

class IsVendorOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.vendor.user == request.user

class IsOrderOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.customer == request.user

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff

class CartViewSet(viewsets.ModelViewSet):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    # Add queryset attribute
    queryset = Cart.objects.all()
    
    def get_queryset(self):
        return Cart.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_cart(self, request):
        """Get the current user's cart"""
        cart, created = Cart.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(cart)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def add_item(self, request):
        """Add service to cart"""
        cart, created = Cart.objects.get_or_create(user=request.user)
        service_id = request.data.get('service_id')
        quantity = request.data.get('quantity', 1)
        
        try:
            service = Service.objects.get(id=service_id, available=True)
        except Service.DoesNotExist:
            return Response(
                {'error': 'Service not found or unavailable'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # ✅ FIX: Set the correct item_type for services
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart, 
            service=service,
            defaults={
                'quantity': quantity,
                'item_type': 'service'  # ✅ EXPLICITLY SET CORRECT TYPE
            }
        )
        
        if not created:
            cart_item.quantity += quantity
            cart_item.save()
        
        serializer = CartItemSerializer(cart_item)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def add_gas_product(self, request):
        """Add gas product to cart"""
        cart, created = Cart.objects.get_or_create(user=request.user)
        product_id = request.data.get('product_id')
        quantity = request.data.get('quantity', 1)
        
        try:
            gas_product = GasProduct.objects.get(
                id=product_id, 
                is_active=True, 
                is_available=True
            )
        except GasProduct.DoesNotExist:
            return Response(
                {'error': 'Gas product not found or unavailable'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check stock
        if gas_product.stock_quantity < quantity:
            return Response(
                {'error': f'Only {gas_product.stock_quantity} units available'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # ✅ FIX: Set the correct item_type for gas products
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart, 
            gas_product=gas_product,
            defaults={
                'quantity': quantity,
                'item_type': 'gas_product'  # ✅ EXPLICITLY SET CORRECT TYPE
            }
        )
        
        if not created:
            cart_item.quantity += quantity
            cart_item.save()
        
        serializer = CartItemSerializer(cart_item)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def update_quantity(self, request):
        """Update item quantity in cart"""
        cart = get_object_or_404(Cart, user=request.user)
        item_id = request.data.get('item_id')
        quantity = request.data.get('quantity', 1)
        
        try:
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
            if quantity <= 0:
                cart_item.delete()
                return Response({'message': 'Item removed from cart'})
            else:
                cart_item.quantity = quantity
                cart_item.save()
                serializer = CartItemSerializer(cart_item)
                return Response(serializer.data)
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Cart item not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def remove_item(self, request):
        """Remove item from cart"""
        cart = get_object_or_404(Cart, user=request.user)
        item_id = request.data.get('item_id')
        
        try:
            cart_item = CartItem.objects.get(id=item_id, cart=cart)
            cart_item.delete()
            return Response({'message': 'Item removed from cart'})
        except CartItem.DoesNotExist:
            return Response(
                {'error': 'Cart item not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def clear(self, request):
        """Clear entire cart"""
        cart = get_object_or_404(Cart, user=request.user)
        cart.items.all().delete()
        return Response({'message': 'Cart cleared successfully'})

class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['id', 'customer__username', 'delivery_address']
    ordering_fields = ['created_at', 'total_amount', 'priority', 'status']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin users can see all orders
        if user.is_staff:
            return Order.objects.all().select_related(
                'customer', 'vendor', 'service', 'gas_product'
            )
        
        # Vendor users can see their own orders
        if user.user_type in ['vendor', 'mechanic'] and hasattr(user, 'vendor_profile'):
            return Order.objects.filter(vendor=user.vendor_profile).select_related(
                'customer', 'vendor', 'service', 'gas_product'
            )
        
        # Regular users can only see their own orders
        return Order.objects.filter(customer=user).select_related(
            'customer', 'vendor', 'service', 'gas_product'
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            # Determine which serializer to use based on request data
            if 'gas_product_id' in self.request.data:
                return CreateGasProductOrderSerializer
            elif 'items' in self.request.data:
                return CreateMixedOrderSerializer
            else:
                return CreateOrderSerializer
        elif self.action in ['update', 'partial_update']:
            if 'status' in self.request.data:
                return UpdateOrderStatusSerializer
            elif 'priority' in self.request.data:
                return UpdateOrderPrioritySerializer
            elif 'estimated_completion_time' in self.request.data:
                return UpdateOrderCompletionTimeSerializer
        elif self.action == 'retrieve':
            return OrderDetailSerializer
        elif self.action in ['vendor_orders', 'vendor_dashboard_orders']:
            return VendorOrderSerializer
        return OrderSerializer
    
    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'update_status', 'update_priority', 
                          'update_completion_time', 'bulk_update_status']:
            return [permissions.IsAuthenticated(), IsVendorOwner()]
        elif self.action in ['destroy']:
            return [permissions.IsAuthenticated(), IsOrderOwner()]
        elif self.action in ['vendor_analytics', 'vendor_dashboard_orders']:
            return [permissions.IsAuthenticated(), IsVendorOwner()]
        return [permissions.IsAuthenticated()]
    
    @transaction.atomic
    def create(self, request):
        serializer_class = self.get_serializer_class()
        serializer = serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        if isinstance(serializer, CreateGasProductOrderSerializer):
            return self._create_gas_product_order(serializer.validated_data)
        elif isinstance(serializer, CreateMixedOrderSerializer):
            return self._create_mixed_order(serializer.validated_data)
        else:
            return self._create_service_order(serializer.validated_data)
    
    def _create_gas_product_order(self, validated_data):
        """Create order for gas product"""
        gas_product = validated_data['gas_product']
        quantity = validated_data['quantity']
        
        # Update product stock
        gas_product.stock_quantity -= quantity
        gas_product.save()
        
        # Create order with commission data
        order = Order.objects.create(
            customer=self.request.user,
            vendor=validated_data['vendor'],
            order_type='gas_product',
            gas_product=gas_product,
            quantity=quantity,
            unit_price=validated_data['unit_price'],
            commission_rate=validated_data.get('commission_rate', 10.00),
            delivery_type=validated_data['delivery_type'],
            location_lat=validated_data.get('location_lat'),
            location_lng=validated_data.get('location_lng'),
            delivery_address=validated_data.get('delivery_address', ''),
            special_instructions=validated_data.get('special_instructions', ''),
            priority=validated_data.get('priority', 'normal')
        )
        
        # Create initial tracking
        OrderTracking.objects.create(order=order, status='pending')
        
        # Update vendor performance metrics
        order.update_vendor_performance()
        
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)
    
    def _create_mixed_order(self, validated_data):
        """Create order with multiple items"""
        items = validated_data['items']
        vendor = items[0]['vendor']  # All items have same vendor (validated)
        
        # Create main order
        order = Order.objects.create(
            customer=self.request.user,
            vendor=vendor,
            order_type='mixed',
            delivery_type=validated_data['delivery_type'],
            delivery_address=validated_data['delivery_address'],
            special_instructions=validated_data.get('special_instructions', ''),
            priority=validated_data.get('priority', 'normal'),
            unit_price=0,  # Will be calculated from items
            total_amount=0,  # Will be calculated from items
            commission_rate=vendor.commission_rate  # Use vendor's commission rate
        )
        
        total_amount = 0
        
        # Create order items
        for item_data in items:
            order_item = OrderItem.objects.create(
                order=order,
                item_type=item_data['type'],
                service=item_data['object'] if item_data['type'] == 'service' else None,
                gas_product=item_data['object'] if item_data['type'] == 'gas_product' else None,
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price']
            )
            
            total_amount += order_item.total_price
            
            # Update stock for gas products
            if item_data['type'] == 'gas_product':
                gas_product = item_data['object']
                gas_product.stock_quantity -= item_data['quantity']
                gas_product.save()
        
        # Update order total and vendor earnings
        order.total_amount = total_amount
        order.unit_price = total_amount  # For mixed orders, unit_price represents order total
        order.save()
        
        # Create initial tracking
        OrderTracking.objects.create(order=order, status='pending')
        
        # Update vendor performance metrics
        order.update_vendor_performance()
        
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)
    
    def _create_service_order(self, validated_data):
        """Original service order creation"""
        service = validated_data['service']
        vendor = service.vendor
        
        order = Order.objects.create(
            customer=self.request.user,
            vendor=vendor,
            order_type='service',
            service=service,
            quantity=validated_data['quantity'],
            unit_price=service.price,
            commission_rate=vendor.commission_rate,
            location_lat=validated_data.get('location_lat'),
            location_lng=validated_data.get('location_lng'),
            delivery_address=validated_data['delivery_address'],
            special_instructions=validated_data.get('special_instructions', ''),
            priority=validated_data.get('priority', 'normal')
        )
        
        OrderTracking.objects.create(order=order, status='pending')
        
        # Update vendor performance metrics
        order.update_vendor_performance()
        
        return Response(OrderDetailSerializer(order).data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update order status"""
        order = self.get_object()
        serializer = UpdateOrderStatusSerializer(order, data=request.data)
        serializer.is_valid(raise_exception=True)
        
        order = serializer.save()
        
        # Update vendor performance metrics
        order.update_vendor_performance()
        
        return Response(OrderDetailSerializer(order).data)
    
    @action(detail=True, methods=['post'])
    def update_priority(self, request, pk=None):
        """Update order priority"""
        order = self.get_object()
        serializer = UpdateOrderPrioritySerializer(order, data=request.data)
        serializer.is_valid(raise_exception=True)
        
        order = serializer.save()
        return Response(OrderDetailSerializer(order).data)
    
    @action(detail=True, methods=['post'])
    def update_completion_time(self, request, pk=None):
        """Update estimated completion time"""
        order = self.get_object()
        serializer = UpdateOrderCompletionTimeSerializer(order, data=request.data)
        serializer.is_valid(raise_exception=True)
        
        order = serializer.save()
        return Response(OrderDetailSerializer(order).data)
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel order and restore stock if applicable"""
        order = self.get_object()
        
        if order.status in ['completed', 'cancelled']:
            return Response(
                {'error': f'Cannot cancel order with status: {order.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Restore stock for gas product orders
        if order.gas_product and order.order_type == 'gas_product':
            order.gas_product.stock_quantity += order.quantity
            order.gas_product.save()
        
        elif order.order_type == 'mixed':
            # Restore stock for all gas product items
            for item in order.items.filter(item_type='gas_product'):
                if item.gas_product:
                    item.gas_product.stock_quantity += item.quantity
                    item.gas_product.save()
        
        order.status = 'cancelled'
        order.save()
        
        OrderTracking.objects.create(
            order=order, 
            status='cancelled',
            note=request.data.get('note', 'Order cancelled by user')
        )
        
        # Update vendor performance metrics
        order.update_vendor_performance()
        
        return Response(OrderDetailSerializer(order).data)
    
    @action(detail=False, methods=['get'])
    def vendor_orders(self, request):
        """Get orders for vendor's services with filtering"""
        if not hasattr(request.user, 'vendor_profile'):
            return Response(
                {'error': 'User is not a vendor'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        vendor = request.user.vendor_profile
        orders = Order.objects.filter(vendor=vendor)
        
        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter:
            orders = orders.filter(status=status_filter)
        
        payment_status_filter = request.query_params.get('payment_status')
        if payment_status_filter:
            orders = orders.filter(payment_status=payment_status_filter)
        
        order_type_filter = request.query_params.get('order_type')
        if order_type_filter:
            orders = orders.filter(order_type=order_type_filter)
        
        priority_filter = request.query_params.get('priority')
        if priority_filter:
            orders = orders.filter(priority=priority_filter)
        
        # Date range filtering
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            orders = orders.filter(created_at__gte=date_from)
        if date_to:
            orders = orders.filter(created_at__lte=date_to)
        
        page = self.paginate_queryset(orders.order_by('-created_at'))
        if page is not None:
            serializer = VendorOrderSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = VendorOrderSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def vendor_dashboard_orders(self, request):
        """Get recent orders for vendor dashboard"""
        if not hasattr(request.user, 'vendor_profile'):
            return Response(
                {'error': 'User is not a vendor'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        vendor = request.user.vendor_profile
        orders = Order.objects.filter(vendor=vendor).order_by('-created_at')[:10]
        
        serializer = VendorOrderSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def gas_product_orders(self, request):
        """Get gas product orders for vendor"""
        if not hasattr(request.user, 'vendor_profile'):
            return Response(
                {'error': 'User is not a vendor'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        vendor = request.user.vendor_profile
        orders = Order.objects.filter(
            vendor=vendor,
            order_type__in=['gas_product', 'mixed']
        )
        
        status_filter = request.query_params.get('status')
        if status_filter:
            orders = orders.filter(status=status_filter)
        
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def tracking(self, request, pk=None):
        """Get order tracking history"""
        order = self.get_object()
        tracking = order.tracking.all()
        serializer = OrderTrackingSerializer(tracking, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def vendor_analytics(self, request):
        """Get order analytics for vendor dashboard"""
        if not hasattr(request.user, 'vendor_profile'):
            return Response(
                {'error': 'User is not a vendor'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        vendor = request.user.vendor_profile
        
        # Date range (default: last 30 days)
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Get orders in date range
        orders = Order.objects.filter(
            vendor=vendor,
            created_at__range=[start_date, end_date]
        )
        
        # Calculate analytics
        total_orders = orders.count()
        pending_orders = orders.filter(status='pending').count()
        completed_orders = orders.filter(status='completed').count()
        cancelled_orders = orders.filter(status='cancelled').count()
        
        # Financial metrics
        completed_orders_financial = orders.filter(status='completed')
        total_revenue = completed_orders_financial.aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        total_commission = completed_orders_financial.aggregate(
            total=Sum('commission_amount')
        )['total'] or 0
        total_vendor_earnings = completed_orders_financial.aggregate(
            total=Sum('vendor_earnings')
        )['total'] or 0
        
        average_order_value = completed_orders_financial.aggregate(
            avg=Avg('total_amount')
        )['avg'] or 0
        
        completion_rate = (completed_orders / total_orders * 100) if total_orders > 0 else 0
        
        # Daily orders for chart
        daily_orders = orders.extra(
            {'date_created': "date(created_at)"}
        ).values('date_created').annotate(
            count=Count('id')
        ).order_by('date_created')
        
        # Weekly revenue
        weekly_revenue = completed_orders_financial.extra(
            {'week': "EXTRACT(week FROM created_at)"}
        ).values('week').annotate(
            revenue=Sum('total_amount')
        ).order_by('week')
        
        analytics_data = {
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'completed_orders': completed_orders,
            'cancelled_orders': cancelled_orders,
            'total_revenue': float(total_revenue),
            'total_commission': float(total_commission),
            'total_vendor_earnings': float(total_vendor_earnings),
            'average_order_value': float(average_order_value),
            'completion_rate': float(completion_rate),
            'daily_orders': [
                {'date': item['date_created'], 'count': item['count']} 
                for item in daily_orders
            ],
            'weekly_revenue': [
                {'week': item['week'], 'revenue': float(item['revenue'])} 
                for item in weekly_revenue
            ]
        }
        
        serializer = OrderAnalyticsSerializer(analytics_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def bulk_update_status(self, request):
        """Bulk update order status for vendor"""
        if not hasattr(request.user, 'vendor_profile'):
            return Response(
                {'error': 'User is not a vendor'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = BulkOrderStatusUpdateSerializer(
            data=request.data, 
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        order_ids = serializer.validated_data['order_ids']
        new_status = serializer.validated_data['status']
        note = serializer.validated_data.get('note', '')
        
        vendor = request.user.vendor_profile
        orders = Order.objects.filter(id__in=order_ids, vendor=vendor)
        
        updated_count = 0
        results = []
        
        for order in orders:
            try:
                # Validate status transition
                valid_transitions = {
                    'pending': ['confirmed', 'cancelled'],
                    'confirmed': ['in_progress', 'cancelled'],
                    'in_progress': ['completed', 'cancelled'],
                    'completed': [],
                    'cancelled': [],
                    'failed': [],
                }
                
                current_status = order.status
                if new_status not in valid_transitions.get(current_status, []):
                    results.append({
                        'order_id': order.id,
                        'success': False,
                        'error': f'Invalid status transition from {current_status} to {new_status}'
                    })
                    continue
                
                # Update order status
                order.status = new_status
                
                # Update timestamps
                if new_status == 'confirmed' and not order.confirmed_at:
                    order.confirmed_at = timezone.now()
                elif new_status == 'completed' and not order.completed_at:
                    order.completed_at = timezone.now()
                
                order.save()
                
                # Create tracking entry
                OrderTracking.objects.create(
                    order=order,
                    status=new_status,
                    note=note
                )
                
                # Update vendor performance
                order.update_vendor_performance()
                
                updated_count += 1
                results.append({
                    'order_id': order.id,
                    'success': True,
                    'new_status': new_status
                })
                
            except Exception as e:
                results.append({
                    'order_id': order.id,
                    'success': False,
                    'error': str(e)
                })
        
        return Response({
            'message': f'Successfully updated {updated_count} out of {len(order_ids)} orders',
            'results': results
        })