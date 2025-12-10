// src/components/GasProductCard.tsx - FIXED VERSION
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ShoppingCart, Loader2, AlertTriangle, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";
import { Badge } from "@/components/ui/badge";

interface GasProduct {
  id: number;
  name: string;
  weight: string;
  description: string;
  priceWithCylinder: number;
  priceWithoutCylinder: number;
  vendor_name?: string;
  vendor_city?: string;
  is_available?: boolean;
  in_stock?: boolean;
  stock_quantity?: number;
  gas_type?: string;
  brand?: string;
}

interface GasProductCardProps {
  product: GasProduct;
  onOrderNow?: (product: GasProduct, includeCylinder: boolean, quantity: number) => void;
  available: boolean;
  showVendorInfo?: boolean;
}

const GasProductCard = ({ 
  product, 
  onOrderNow, 
  available, 
  showVendorInfo = true 
}: GasProductCardProps) => {
  const [quantity, setQuantity] = useState(1);
  const [includeCylinder, setIncludeCylinder] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  
  // ✅ FIXED: Use correct CartContext methods
  const { addItem, syncWithBackend } = useCart();

  const currentPrice = includeCylinder ? product.priceWithCylinder : product.priceWithoutCylinder;
  const totalPrice = currentPrice * quantity;

  // Stock status calculations
  const isLowStock = product.stock_quantity !== undefined && product.stock_quantity > 0 && product.stock_quantity <= 5;
  const isOutOfStock = product.stock_quantity === 0;
  const isAvailable = available && !isOutOfStock;

  // Enhanced add to cart with better error handling
  const handleAddToCart = async () => {
    if (!isAvailable) {
      toast.error("This product is currently unavailable");
      return;
    }

    // Validate stock availability
    if (product.stock_quantity !== undefined && quantity > product.stock_quantity) {
      toast.error(`Only ${product.stock_quantity} units available in stock`);
      return;
    }

    setAddingToCart(true);
    try {
      console.log('🛒 Adding product to cart:', { 
        productId: product.id, 
        quantity, 
        includeCylinder,
        productName: product.name
      });
      
      // Create cart item object matching CartContext's addItem signature
      const cartItem = {
        id: product.id,
        name: product.name,
        price: currentPrice,
        quantity: quantity,
        vendor_id: 1, // Default vendor ID - you might want to get this from the product
        vendor_name: product.vendor_name || 'Gas Vendor',
        vendor_city: product.vendor_city || 'Nairobi',
        gas_type: product.gas_type,
        cylinder_size: product.weight,
        price_with_cylinder: product.priceWithCylinder,
        price_without_cylinder: product.priceWithoutCylinder,
        stock_quantity: product.stock_quantity,
        is_available: product.is_available
      };

      // ✅ FIXED: Use addItem method from CartContext
      await addItem(cartItem);
      
      toast.success(`Added ${quantity}x ${product.name} to cart`);
      
      // ✅ FIXED: Use syncWithBackend instead of refreshCart
      await syncWithBackend();
      
    } catch (error: any) {
      console.error('❌ Error adding to cart:', error);
      handleCartError(error);
    } finally {
      setAddingToCart(false);
    }
  };

  // Extracted error handling logic
  const handleCartError = (error: any) => {
    let errorMessage = "Failed to add to cart. Please try again.";
    
    if (error.message === 'Please log in to add items to cart') {
      errorMessage = "Please log in to add items to cart";
    } else if (error.message === 'Request timeout') {
      errorMessage = "Request took too long. Please check your connection.";
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.code === 'NETWORK_ERROR') {
      errorMessage = "Network error. Please check your internet connection.";
    } else if (error.response?.status === 401) {
      errorMessage = "Please log in to add items to cart";
    } else if (error.response?.status === 400) {
      errorMessage = "Invalid request. Please check the product details.";
    } else if (error.response?.status === 404) {
      errorMessage = "Product not found. It may have been removed.";
    } else if (error.response?.status === 500) {
      errorMessage = "Server error. Please try again later.";
    }
    
    toast.error(errorMessage);
  };

  const handleOrderNow = () => {
    if (onOrderNow && isAvailable) {
      onOrderNow(product, includeCylinder, quantity);
    }
  };

  const handleQuantityIncrease = () => {
    const newQuantity = quantity + 1;
    if (product.stock_quantity !== undefined && newQuantity > product.stock_quantity) {
      toast.error(`Only ${product.stock_quantity} units available`);
      return;
    }
    setQuantity(newQuantity);
  };

  const handleQuantityDecrease = () => {
    setQuantity(Math.max(1, quantity - 1));
  };

  return (
    <Card className={`p-4 hover:shadow-lg transition-shadow duration-300 ${
      !isAvailable ? 'opacity-70 grayscale' : ''
    }`}>
      <div className="space-y-4">
        {/* Header Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-lg leading-tight">{product.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{product.weight}</p>
            </div>
            <StockBadge 
              isAvailable={isAvailable} 
              isLowStock={isLowStock} 
              stockQuantity={product.stock_quantity} 
            />
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
          
          {/* Product Details */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {product.gas_type && (
              <Badge variant="outline" className="text-xs">
                {product.gas_type.toUpperCase()}
              </Badge>
            )}
            {product.brand && (
              <span className="font-medium">Brand: {product.brand}</span>
            )}
          </div>

          {/* Vendor Info */}
          {showVendorInfo && product.vendor_name && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="font-medium">{product.vendor_name}</span>
              {product.vendor_city && <span>• {product.vendor_city}</span>}
            </div>
          )}
          
          {/* Stock Info */}
          {product.stock_quantity !== undefined && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Stock:</span> {product.stock_quantity} units
            </div>
          )}
        </div>

        {/* Cylinder Options */}
        <CylinderOptions
          productId={product.id}
          includeCylinder={includeCylinder}
          setIncludeCylinder={setIncludeCylinder}
          priceWithoutCylinder={product.priceWithoutCylinder}
          priceWithCylinder={product.priceWithCylinder}
          disabled={!isAvailable}
        />

        {/* Quantity and Total Section */}
        <div className="flex items-center justify-between pt-2">
          <QuantitySelector
            quantity={quantity}
            onDecrease={handleQuantityDecrease}
            onIncrease={handleQuantityIncrease}
            disabled={!isAvailable}
            maxQuantity={product.stock_quantity}
          />
          
          <TotalDisplay totalPrice={totalPrice} />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <AddToCartButton
            onClick={handleAddToCart}
            loading={addingToCart}
            disabled={!isAvailable}
            isAvailable={isAvailable}
          />
          
          {onOrderNow && (
            <OrderNowButton
              onClick={handleOrderNow}
              disabled={!isAvailable}
            />
          )}
        </div>

        {/* Stock Alerts */}
        <StockAlerts 
          isLowStock={isLowStock}
          isOutOfStock={isOutOfStock}
          stockQuantity={product.stock_quantity}
        />
      </div>
    </Card>
  );
};

// Extracted Sub-Components for Better Readability

interface StockBadgeProps {
  isAvailable: boolean;
  isLowStock: boolean;
  stockQuantity?: number;
}

const StockBadge = ({ isAvailable, isLowStock, stockQuantity }: StockBadgeProps) => {
  if (!isAvailable) {
    return (
      <Badge variant="destructive" className="text-xs">
        Out of Stock
      </Badge>
    );
  }

  if (isLowStock) {
    return (
      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Low Stock
      </Badge>
    );
  }

  return null;
};

interface CylinderOptionsProps {
  productId: number;
  includeCylinder: boolean;
  setIncludeCylinder: (value: boolean) => void;
  priceWithoutCylinder: number;
  priceWithCylinder: number;
  disabled: boolean;
}

const CylinderOptions = ({
  productId,
  includeCylinder,
  setIncludeCylinder,
  priceWithoutCylinder,
  priceWithCylinder,
  disabled
}: CylinderOptionsProps) => (
  <div className="space-y-2">
    <CylinderOption
      id={`without-${productId}`}
      name={`cylinder-${productId}`}
      label="Without Cylinder"
      price={priceWithoutCylinder}
      checked={!includeCylinder}
      onChange={() => setIncludeCylinder(false)}
      disabled={disabled}
      active={!includeCylinder}
    />
    <CylinderOption
      id={`with-${productId}`}
      name={`cylinder-${productId}`}
      label="With Cylinder"
      price={priceWithCylinder}
      checked={includeCylinder}
      onChange={() => setIncludeCylinder(true)}
      disabled={disabled}
      active={includeCylinder}
    />
  </div>
);

interface CylinderOptionProps {
  id: string;
  name: string;
  label: string;
  price: number;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  active: boolean;
}

const CylinderOption = ({
  id,
  name,
  label,
  price,
  checked,
  onChange,
  disabled,
  active
}: CylinderOptionProps) => (
  <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
    active 
      ? 'bg-primary/5 border-primary shadow-sm' 
      : 'bg-muted/50 border-muted hover:bg-muted/70'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  onClick={!disabled ? onChange : undefined}>
    <div className="flex items-center gap-2">
      <input
        type="radio"
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
        className="cursor-pointer"
        disabled={disabled}
      />
      <label htmlFor={id} className="cursor-pointer text-sm font-medium">
        {label}
      </label>
    </div>
    <span className="font-semibold text-primary">KSh {price.toLocaleString()}</span>
  </div>
);

interface QuantitySelectorProps {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  disabled: boolean;
  maxQuantity?: number;
}

const QuantitySelector = ({
  quantity,
  onDecrease,
  onIncrease,
  disabled,
  maxQuantity
}: QuantitySelectorProps) => (
  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      size="icon"
      onClick={onDecrease}
      className="h-8 w-8"
      disabled={disabled || quantity <= 1}
    >
      <Minus className="h-4 w-4" />
    </Button>
    <span className="font-semibold w-8 text-center text-lg">{quantity}</span>
    <Button
      variant="outline"
      size="icon"
      onClick={onIncrease}
      className="h-8 w-8"
      disabled={disabled || (maxQuantity !== undefined && quantity >= maxQuantity)}
    >
      <Plus className="h-4 w-4" />
    </Button>
  </div>
);

interface TotalDisplayProps {
  totalPrice: number;
}

const TotalDisplay = ({ totalPrice }: TotalDisplayProps) => (
  <div className="text-right">
    <p className="text-xs text-muted-foreground">Total</p>
    <p className="text-xl font-bold text-primary">KSh {totalPrice.toLocaleString()}</p>
  </div>
);

interface AddToCartButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  isAvailable: boolean;
}

const AddToCartButton = ({ onClick, loading, disabled, isAvailable }: AddToCartButtonProps) => (
  <Button 
    onClick={onClick} 
    className="flex-1" 
    size="lg"
    disabled={disabled || loading}
    variant={isAvailable ? "default" : "outline"}
  >
    {loading ? (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Adding...
      </>
    ) : (
      <>
        <ShoppingCart className="h-4 w-4 mr-2" />
        {!isAvailable ? "Out of Stock" : "Add to Cart"}
      </>
    )}
  </Button>
);

interface OrderNowButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const OrderNowButton = ({ onClick, disabled }: OrderNowButtonProps) => (
  <Button 
    onClick={onClick}
    variant="outline"
    size="lg"
    disabled={disabled}
  >
    Order Now
  </Button>
);

interface StockAlertsProps {
  isLowStock: boolean;
  isOutOfStock: boolean;
  stockQuantity?: number;
}

const StockAlerts = ({ isLowStock, isOutOfStock, stockQuantity }: StockAlertsProps) => {
  if (isLowStock) {
    return (
      <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg flex items-center gap-2">
        <AlertTriangle className="h-3 w-3" />
        Only {stockQuantity} left in stock. Order soon!
      </div>
    );
  }

  if (isOutOfStock) {
    return (
      <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-2">
        <AlertTriangle className="h-3 w-3" />
        Currently out of stock. Check back later.
      </div>
    );
  }

  return null;
};

export default GasProductCard;