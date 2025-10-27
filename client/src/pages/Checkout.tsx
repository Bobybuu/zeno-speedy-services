// src/pages/Checkout.tsx - FIXED VERSION
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Shield, Truck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { useCart } from "@/context/CartContext";
import { useState, useEffect } from "react";

// Define proper interfaces
interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  vendorName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  includeCylinder: boolean;
  description?: string;
  gas_product_details?: {
    stock_quantity?: number;
    is_available?: boolean;
  };
}

interface CheckoutState {
  orderItems: OrderItem[];
  totalAmount: number;
  cartData?: any;
}

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ✅ FIXED: Use correct CartContext properties
  const { state: cartState } = useCart();
  
  const [checkoutData, setCheckoutData] = useState<CheckoutState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize checkout data from location state or cart
  useEffect(() => {
    const initializeCheckout = () => {
      try {
        const state = location.state as CheckoutState;
        
        if (state?.orderItems && state.orderItems.length > 0) {
          console.log('🛒 Checkout received order items:', state.orderItems);
          setCheckoutData(state);
        } else if (cartState?.items && cartState.items.length > 0) {
          // ✅ FIXED: Use cartState instead of cart
          console.log('🛒 Generating order items from cart state');
          const orderItems = cartState.items.map((item: any) => ({
            id: item.id,
            productId: item.id, // Use item.id as productId for local cart items
            productName: item.name || 'Gas Product',
            vendorName: item.vendor_name || 'Vendor',
            quantity: item.quantity,
            unitPrice: item.price || 0,
            totalAmount: (item.price || 0) * item.quantity,
            includeCylinder: false, // Default for local cart items
            description: `${item.cylinder_size || 'Unknown'} • ${item.gas_type?.toUpperCase() || 'GAS'}`,
            gas_product_details: {
              stock_quantity: item.stock_quantity,
              is_available: item.is_available
            }
          }));
          
          setCheckoutData({
            orderItems,
            totalAmount: cartState.total || 0
          });
        } else {
          console.warn('❌ No checkout data available');
        }
      } catch (error) {
        console.error('❌ Error initializing checkout:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCheckout();
  }, [location.state, cartState]); // ✅ FIXED: Use cartState as dependency

  // Calculate order summary
  const calculateOrderSummary = () => {
    if (!checkoutData?.orderItems || checkoutData.orderItems.length === 0) {
      return {
        subtotal: 0,
        deliveryFee: 0,
        total: 0
      };
    }

    const subtotal = checkoutData.orderItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    const deliveryFee = 200; // Fixed delivery fee
    const total = subtotal + deliveryFee;

    return { subtotal, deliveryFee, total };
  };

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
  };

  // Check for stock issues
  const hasStockIssues = checkoutData?.orderItems.some(item => 
    item.gas_product_details && 
    item.gas_product_details.stock_quantity !== undefined &&
    item.quantity > item.gas_product_details.stock_quantity
  );

  const hasUnavailableItems = checkoutData?.orderItems.some(item => 
    item.gas_product_details && 
    !item.gas_product_details.is_available
  );

  const orderSummary = calculateOrderSummary();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!checkoutData?.orderItems || checkoutData.orderItems.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 bg-primary text-white shadow-lg">
          <div className="flex items-center gap-3 p-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Checkout</h1>
          </div>
        </header>

        <div className="flex items-center justify-center h-64">
          <div className="text-center p-4">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No items to checkout</h3>
            <p className="text-muted-foreground mb-6">
              Your cart is empty or there was an error loading your order.
            </p>
            <Button onClick={() => navigate('/cart')}>
              Back to Cart
            </Button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-white shadow-lg">
        <div className="flex items-center gap-3 p-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Checkout</h1>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Order Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Order Items
              <Badge variant="secondary" className="ml-2">
                {checkoutData.orderItems.length} {checkoutData.orderItems.length === 1 ? 'item' : 'items'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkoutData.orderItems.map((item: OrderItem, index: number) => (
              <div key={`${item.productId}-${index}`} className="flex justify-between items-start py-2">
                <div className="flex-1">
                  <p className="font-medium">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.vendorName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity} • {item.includeCylinder ? 'With Cylinder' : 'Without Cylinder'}
                  </p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  )}
                  {/* Stock warnings */}
                  {item.gas_product_details && (
                    <div className="mt-1">
                      {item.gas_product_details.stock_quantity !== undefined && 
                       item.quantity > item.gas_product_details.stock_quantity && (
                        <Badge variant="destructive" className="text-xs">
                          Only {item.gas_product_details.stock_quantity} in stock
                        </Badge>
                      )}
                      {!item.gas_product_details.is_available && (
                        <Badge variant="destructive" className="text-xs">
                          Unavailable
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(item.totalAmount)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(item.unitPrice)} each
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal ({checkoutData.orderItems.length} items)</span>
              <span>{formatCurrency(orderSummary.subtotal)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery Fee</span>
              <span>{formatCurrency(orderSummary.deliveryFee)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount</span>
              <span className="text-primary">{formatCurrency(orderSummary.total)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="h-5 w-5" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Method</span>
              <span>Standard Delivery</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Delivery</span>
              <span>1-2 hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Area</span>
              <span>Nairobi & Surrounding</span>
            </div>
          </CardContent>
        </Card>

        {/* Security Badge */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Secure Checkout</p>
                <p className="text-sm text-green-700">
                  Your payment is encrypted and secure. We use M-Pesa's secure payment gateway.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proceed to Payment Button */}
        <Button 
          className="w-full" 
          size="lg"
          onClick={() => navigate('/payment', { 
            state: { 
              orderItems: checkoutData.orderItems, 
              totalAmount: orderSummary.total,
              orderSummary 
            } 
          })}
          disabled={hasStockIssues || hasUnavailableItems}
        >
          {hasStockIssues || hasUnavailableItems ? (
            "Cannot Proceed - Stock Issues"
          ) : (
            `Proceed to Payment (${formatCurrency(orderSummary.total)})`
          )}
        </Button>

        {/* Warning Messages */}
        {(hasStockIssues || hasUnavailableItems) && (
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <p className="text-sm text-orange-800">
                {hasStockIssues && "Some items have stock issues. "}
                {hasUnavailableItems && "Some items are unavailable. "}
                Please review your order before proceeding.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Checkout;