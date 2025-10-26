// src/components/GasProductCard.tsx - UPDATED VERSION
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Minus, ShoppingCart, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/context/CartContext";

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
}

interface GasProductCardProps {
  product: GasProduct;
  onOrderNow?: (product: GasProduct, includeCylinder: boolean) => void;
  available: boolean;
}

const GasProductCard = ({ product, onOrderNow, available }: GasProductCardProps) => {
  const [quantity, setQuantity] = useState(1);
  const [includeCylinder, setIncludeCylinder] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  
  const { addToCart, refreshCart } = useCart();

  const currentPrice = includeCylinder ? product.priceWithCylinder : product.priceWithoutCylinder;
  const totalPrice = currentPrice * quantity;

  // ✅ ENHANCED: Add to cart with detailed debugging
  const handleAddToCart = async () => {
    if (!available) {
      toast.error("This product is currently unavailable");
      return;
    }

    // Check stock availability
    if (product.stock_quantity !== undefined && quantity > product.stock_quantity) {
      toast.error(`Only ${product.stock_quantity} units available in stock`);
      return;
    }

    setAddingToCart(true);
    try {
      console.log('🛒 GasProductCard: Adding product to cart:', { 
        productId: product.id, 
        quantity, 
        includeCylinder,
        productName: product.name
      });
      
      // ✅ Add timeout handling
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      // ✅ Use Promise.race to handle timeout
      await Promise.race([
        addToCart(product.id, quantity, includeCylinder), 
        timeoutPromise
      ]);
      
      console.log('✅ GasProductCard: Successfully added to cart');
      toast.success(`Added ${quantity}x ${product.name} to cart`);
      
      // Refresh cart to ensure UI updates
      await refreshCart();
      
    } catch (error: any) {
      console.error('❌ GasProductCard: Error adding to cart:', error);
      
      // ✅ Enhanced error message handling
      let errorMessage = "Failed to add to cart. Please try again.";
      
      if (error.message === 'Please log in to add items to cart') {
        errorMessage = "Please log in to add items to cart";
      } else if (error.message === 'Request timeout') {
        errorMessage = "Request took too long. Please check your connection.";
      } else if (error.response?.data?.error) {
        // Use server-provided error message
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        // Use the error message from the exception
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
      
    } finally {
      setAddingToCart(false);
    }
  };

  const handleOrderNow = () => {
    if (onOrderNow) {
      onOrderNow(product, includeCylinder);
    }
  };

  // Stock status indicators
  const isLowStock = product.stock_quantity !== undefined && product.stock_quantity > 0 && product.stock_quantity <= 5;
  const isOutOfStock = product.stock_quantity === 0;
  const isAvailable = available && !isOutOfStock;

  return (
    <Card className={`p-4 hover:shadow-lg transition-shadow ${!isAvailable ? 'opacity-70' : ''}`}>
      <div className="space-y-4">
        {/* Header with stock status */}
        <div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg">{product.name}</h3>
            {!isAvailable && (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                Out of Stock
              </span>
            )}
            {isLowStock && (
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Low Stock
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{product.weight}</p>
          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
          
          {/* Vendor Info */}
          {product.vendor_name && (
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium">Vendor:</span> {product.vendor_name}
              {product.vendor_city && ` • ${product.vendor_city}`}
            </div>
          )}
          
          {/* Stock Info */}
          {product.stock_quantity !== undefined && (
            <div className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium">Stock:</span> {product.stock_quantity} units
            </div>
          )}
        </div>

        {/* Cylinder Options */}
        <div className="space-y-2">
          <div className={`flex items-center justify-between p-3 rounded-lg border ${
            !includeCylinder ? 'bg-primary/5 border-primary' : 'bg-muted/50 border-muted'
          }`}>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id={`without-${product.id}`}
                name={`cylinder-${product.id}`}
                checked={!includeCylinder}
                onChange={() => setIncludeCylinder(false)}
                className="cursor-pointer"
                disabled={!isAvailable}
              />
              <label htmlFor={`without-${product.id}`} className="cursor-pointer text-sm">
                Without Cylinder
              </label>
            </div>
            <span className="font-semibold">KSh {product.priceWithoutCylinder.toLocaleString()}</span>
          </div>

          <div className={`flex items-center justify-between p-3 rounded-lg border ${
            includeCylinder ? 'bg-primary/5 border-primary' : 'bg-muted/50 border-muted'
          }`}>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                id={`with-${product.id}`}
                name={`cylinder-${product.id}`}
                checked={includeCylinder}
                onChange={() => setIncludeCylinder(true)}
                className="cursor-pointer"
                disabled={!isAvailable}
              />
              <label htmlFor={`with-${product.id}`} className="cursor-pointer text-sm">
                With Cylinder
              </label>
            </div>
            <span className="font-semibold">KSh {product.priceWithCylinder.toLocaleString()}</span>
          </div>
        </div>

        {/* Quantity and Total */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-8 w-8"
              disabled={!isAvailable || quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-semibold w-8 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                const newQuantity = quantity + 1;
                // Check if new quantity exceeds available stock
                if (product.stock_quantity !== undefined && newQuantity > product.stock_quantity) {
                  toast.error(`Only ${product.stock_quantity} units available`);
                  return;
                }
                setQuantity(newQuantity);
              }}
              className="h-8 w-8"
              disabled={!isAvailable || (product.stock_quantity !== undefined && quantity >= product.stock_quantity)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold text-primary">KSh {totalPrice.toLocaleString()}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleAddToCart} 
            className="flex-1" 
            size="lg"
            disabled={!isAvailable || addingToCart}
            variant={isAvailable ? "default" : "outline"}
          >
            {addingToCart ? (
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
          
          {onOrderNow && (
            <Button 
              onClick={handleOrderNow}
              variant="outline"
              size="lg"
              disabled={!isAvailable}
            >
              Order Now
            </Button>
          )}
        </div>

        {/* Additional Info */}
        {isLowStock && (
          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" />
            Only {product.stock_quantity} left in stock. Order soon!
          </div>
        )}

        {isOutOfStock && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" />
            Currently out of stock. Check back later.
          </div>
        )}
      </div>
    </Card>
  );
};

export default GasProductCard;