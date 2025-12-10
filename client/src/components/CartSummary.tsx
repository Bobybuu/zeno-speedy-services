// src/components/CartSummary.tsx - FIXED VERSION
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  Truck, 
  Shield, 
  AlertTriangle, 
  Loader2,
  CreditCard,
  MapPin
} from "lucide-react";
import { useCart } from "@/context/CartContext";

interface CartSummaryProps {
  onCheckout?: () => void;
  onContinueShopping?: () => void;
  isLoading?: boolean;
  deliveryFee?: number;
  className?: string;
  showCheckoutButton?: boolean;
}

const CartSummary = ({
  onCheckout,
  onContinueShopping,
  isLoading = false,
  deliveryFee = 200,
  className = "",
  showCheckoutButton = true
}: CartSummaryProps) => {
  const { state } = useCart(); // ✅ FIXED: Use 'state' instead of 'cart' and 'loading'

  // ✅ FIXED: Calculate totals from state
  const subtotal = state?.total || 0;
  const total = subtotal + deliveryFee;
  const itemCount = state?.itemCount || 0;

  // Check if cart has items
  const hasItems = itemCount > 0;

  // ✅ FIXED: Check for out of stock items using the correct property structure
  const hasOutOfStockItems = state?.items?.some(item => 
    item.stock_quantity !== undefined &&
    item.quantity > item.stock_quantity
  );

  // ✅ FIXED: Check for unavailable items using the correct property structure
  const hasUnavailableItems = state?.items?.some(item => 
    !item.is_available
  );

  // ✅ FIXED: Removed loading check since CartContext doesn't have loading state

  if (!hasItems) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
          <p className="text-muted-foreground mb-4">
            Add some gas products to get started
          </p>
          {onContinueShopping && (
            <Button onClick={onContinueShopping}>
              Continue Shopping
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Order Summary
          {itemCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Warnings */}
        <CartWarnings 
          hasOutOfStockItems={hasOutOfStockItems}
          hasUnavailableItems={hasUnavailableItems}
        />

        {/* Pricing Breakdown */}
        <div className="space-y-3">
          <PricingRow 
            label="Subtotal" 
            value={subtotal} 
          />
          <PricingRow 
            label="Delivery Fee" 
            value={deliveryFee} 
          />
          <div className="border-t pt-3">
            <PricingRow 
              label="Total" 
              value={total} 
              isTotal
            />
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2 text-sm">
          <FeatureItem 
            icon={Truck}
            text="Free delivery on orders over KSh 5,000"
          />
          <FeatureItem 
            icon={Shield}
            text="Secure payment processing"
          />
          <FeatureItem 
            icon={MapPin}
            text="Delivery within 2-4 hours"
          />
        </div>

        {/* Action Buttons */}
        {showCheckoutButton && (
          <div className="space-y-2 pt-2">
            <Button
              className="w-full"
              size="lg"
              onClick={onCheckout}
              disabled={isLoading || !hasItems || hasOutOfStockItems || hasUnavailableItems}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Proceed to Checkout
                </>
              )}
            </Button>

            {onContinueShopping && (
              <Button
                variant="outline"
                className="w-full"
                onClick={onContinueShopping}
              >
                Continue Shopping
              </Button>
            )}
          </div>
        )}

        {/* Security Badge */}
        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            Secure checkout • Encrypted payment
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// Sub-components for better organization

interface CartWarningsProps {
  hasOutOfStockItems: boolean;
  hasUnavailableItems: boolean;
}

const CartWarnings = ({ hasOutOfStockItems, hasUnavailableItems }: CartWarningsProps) => {
  if (!hasOutOfStockItems && !hasUnavailableItems) return null;

  return (
    <div className="space-y-2">
      {hasOutOfStockItems && (
        <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded-lg">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Some items in your cart are out of stock</span>
        </div>
      )}
      {hasUnavailableItems && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Some items in your cart are unavailable</span>
        </div>
      )}
    </div>
  );
};

interface PricingRowProps {
  label: string;
  value: number;
  isTotal?: boolean;
}

const PricingRow = ({ label, value, isTotal = false }: PricingRowProps) => (
  <div className={`flex justify-between items-center ${
    isTotal ? 'text-lg font-semibold' : 'text-sm'
  }`}>
    <span className={isTotal ? 'font-semibold' : ''}>{label}</span>
    <span className={isTotal ? 'font-bold text-primary' : ''}>
      KSh {value.toLocaleString()}
    </span>
  </div>
);

interface FeatureItemProps {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}

const FeatureItem = ({ icon: Icon, text }: FeatureItemProps) => (
  <div className="flex items-center gap-2 text-muted-foreground">
    <Icon className="h-4 w-4 text-green-600" />
    <span>{text}</span>
  </div>
);

// Skeleton loading state (removed since CartContext doesn't have loading state)
const CartSummarySkeleton = () => (
  <Card>
    <CardHeader className="pb-4">
      <div className="h-6 bg-muted rounded w-32"></div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-3">
        <SkeletonPricingRow />
        <SkeletonPricingRow />
        <div className="border-t pt-3">
          <SkeletonPricingRow isTotal />
        </div>
      </div>
      <div className="space-y-2">
        <SkeletonFeature />
        <SkeletonFeature />
        <SkeletonFeature />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-10 bg-muted rounded"></div>
        <div className="h-9 bg-muted rounded"></div>
      </div>
    </CardContent>
  </Card>
);

const SkeletonPricingRow = ({ isTotal = false }: { isTotal?: boolean }) => (
  <div className={`flex justify-between ${isTotal ? 'pt-2' : ''}`}>
    <div className={`h-4 bg-muted rounded ${isTotal ? 'w-20' : 'w-16'}`}></div>
    <div className={`h-4 bg-muted rounded ${isTotal ? 'w-24' : 'w-20'}`}></div>
  </div>
);

const SkeletonFeature = () => (
  <div className="flex items-center gap-2">
    <div className="h-4 w-4 bg-muted rounded"></div>
    <div className="h-4 bg-muted rounded w-48"></div>
  </div>
);

export default CartSummary;