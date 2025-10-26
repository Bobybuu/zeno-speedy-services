// src/pages/Checkout.tsx
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import BottomNav from "@/components/BottomNav";

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
}

interface CheckoutState {
  orderItems: OrderItem[];
  totalAmount: number;
  cartData?: any;
}

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderItems, totalAmount, cartData } = (location.state as CheckoutState) || {};

  // ✅ FIXED: Calculate order summary without tax
  const calculateOrderSummary = () => {
    if (!orderItems || orderItems.length === 0) {
      return {
        subtotal: 0,
        deliveryFee: 0,
        total: 0
      };
    }

    // Calculate subtotal from all items
    const subtotal = orderItems.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
    
    // Calculate delivery fee (KSh 200 for demo, or based on vendor/distance)
    const deliveryFee = 200;
    
    // ✅ REMOVED: Tax calculation since prices already include tax
    // Calculate total (subtotal + delivery fee only)
    const total = subtotal + deliveryFee;

    return {
      subtotal,
      deliveryFee,
      total
    };
  };

  // ✅ FIXED: Proper number formatting function
  const formatCurrency = (amount: number): string => {
    // Remove any leading zeros and format as proper Kenyan Shillings
    return `KSh ${Math.round(amount).toLocaleString('en-KE')}`;
  };

  const orderSummary = calculateOrderSummary();

  // If no order items, redirect back to cart
  if (!orderItems || orderItems.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <div className="text-center p-4">
          <div className="text-6xl mb-4">🛒</div>
          <h3 className="text-lg font-semibold mb-2">No items to checkout</h3>
          <p className="text-muted-foreground mb-6">
            Your cart is empty or there was an error loading your order.
          </p>
          <Button onClick={() => navigate('/cart')}>
            Back to Cart
          </Button>
        </div>
      </div>
    );
  }

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

      <div className="p-4 space-y-6">
        {/* Order Items */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Order Items</h2>
          <div className="space-y-3">
            {orderItems.map((item: OrderItem, index: number) => (
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
                </div>
                <div className="text-right">
                  {/* ✅ FIXED: Use proper currency formatting */}
                  <p className="font-semibold">{formatCurrency(item.totalAmount)}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(item.unitPrice)} each
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Order Summary */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal ({orderItems.length} items)</span>
              {/* ✅ FIXED: Use proper currency formatting */}
              <span>{formatCurrency(orderSummary.subtotal)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Fee</span>
              {/* ✅ FIXED: Use proper currency formatting */}
              <span>{formatCurrency(orderSummary.deliveryFee)}</span>
            </div>
            
            {/* ✅ REMOVED: Tax row since prices already include tax */}
            
            <Separator className="my-2" />
            
            <div className="flex justify-between text-base font-bold">
              <span>Total Amount</span>
              {/* ✅ FIXED: Use proper currency formatting */}
              <span className="text-primary">{formatCurrency(orderSummary.total)}</span>
            </div>
          </div>
        </Card>

        {/* Delivery Information */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Delivery Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery Method</span>
              <span>Standard Delivery</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Delivery</span>
              <span>1-2 hours</span>
            </div>
          </div>
        </Card>

        {/* Payment Method */}
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Payment Method</h2>
          <p className="text-sm text-muted-foreground">
            You'll be able to choose your preferred payment method on the next page.
          </p>
        </Card>

        <Button 
          className="w-full" 
          size="lg"
          onClick={() => navigate('/payment', { 
            state: { 
              orderItems, 
              totalAmount: orderSummary.total, // Use calculated total
              orderSummary 
            } 
          })}
        >
          {/* ✅ FIXED: Use proper currency formatting in button */}
          Proceed to Payment ({formatCurrency(orderSummary.total)})
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Checkout;