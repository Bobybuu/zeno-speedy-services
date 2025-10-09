import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Loader2, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

// Updated interfaces to match your Django backend
interface GasProduct {
  id: number;
  name: string;
  gas_type: string;
  cylinder_size: string;
  brand: string;
  price_with_cylinder: number;
  price_without_cylinder: number;
  vendor_name: string;
  vendor_city: string;
  vendor_address: string;
  vendor_contact: string;
  is_available: boolean;
  in_stock: boolean;
  stock_quantity: number;
  min_stock_alert: number;
  description?: string;
}

interface CartItem {
  id: number;
  item_type: 'service' | 'gas_product';
  service?: number;
  gas_product?: number;
  gas_product_details?: GasProduct;
  service_details?: any;
  quantity: number;
  unit_price: number;
  total_price: number;
  added_at: string;
  item_name: string;
}

interface Cart {
  id: number;
  user: number;
  items: CartItem[];
  total_amount: number;
  item_count: number;
  created_at: string;
  updated_at: string;
}

const Cart = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  // Load cart from localStorage as fallback
  const loadCartFromLocalStorage = (): Cart => {
    try {
      const localCart = localStorage.getItem('gas_cart');
      if (localCart) {
        return JSON.parse(localCart);
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
    
    return {
      id: 0,
      user: 0,
      items: [],
      total_amount: 0,
      item_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  // Save cart to localStorage
  const saveCartToLocalStorage = (cartData: Cart) => {
    try {
      localStorage.setItem('gas_cart', JSON.stringify(cartData));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  };

  // Fetch cart data from backend
  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        console.log('No auth token, using localStorage cart');
        const localCart = loadCartFromLocalStorage();
        setCart(localCart);
        setLoading(false);
        return;
      }

      // Updated endpoint to match your Django URLs
      const response = await fetch(`${API_BASE}/api/orders/cart/my_cart/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const cartData = await response.json();
        setCart(cartData);
        saveCartToLocalStorage(cartData);
      } else if (response.status === 404) {
        // Cart doesn't exist yet - create empty cart
        const emptyCart = {
          id: 0,
          user: 0,
          items: [],
          total_amount: 0,
          item_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setCart(emptyCart);
        saveCartToLocalStorage(emptyCart);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Error fetching cart:', error);
      
      // Fallback to localStorage
      const localCart = loadCartFromLocalStorage();
      setCart(localCart);
      
      if (!error.message.includes('404')) {
        toast({
          title: "Using Local Cart",
          description: "Connected to local cart. Some features may be limited.",
          variant: "default",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // Add gas product to cart
  const addGasProductToCart = async (productId: number, quantity: number = 1) => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        const response = await fetch(`${API_BASE}/api/orders/cart/add_gas_product/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product_id: productId,
            quantity: quantity
          })
        });

        if (response.ok) {
          await fetchCart();
          toast({
            title: "Added to Cart",
            description: "Product added to cart successfully",
          });
          return true;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add product to cart');
        }
      } else {
        // Fallback: Add to local storage
        const currentCart = cart || loadCartFromLocalStorage();
        
        // In a real implementation, you'd fetch the product details first
        const newItem: CartItem = {
          id: Date.now(), // Temporary ID for local storage
          item_type: 'gas_product',
          gas_product: productId,
          quantity: quantity,
          unit_price: 0, // You'd get this from product details
          total_price: 0,
          added_at: new Date().toISOString(),
          item_name: 'Gas Product' // You'd get this from product details
        };
        
        const updatedItems = [...currentCart.items, newItem];
        const total_amount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
        const updatedCart = {
          ...currentCart,
          items: updatedItems,
          total_amount,
          item_count: updatedItems.reduce((count, item) => count + item.quantity, 0),
          updated_at: new Date().toISOString()
        };
        
        saveCartToLocalStorage(updatedCart);
        setCart(updatedCart);
        toast({
          title: "Added to Cart",
          description: "Product added to local cart",
        });
        return true;
      }
    } catch (error: any) {
      console.error('Error adding product to cart:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add product to cart",
        variant: "destructive",
      });
      return false;
    }
  };

  // Update item quantity
  const updateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeItem(itemId);
      return;
    }

    setUpdating(itemId);
    try {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        // Use the update_quantity endpoint
        const response = await fetch(`${API_BASE}/api/orders/cart/update_quantity/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            item_id: itemId, 
            quantity: newQuantity 
          })
        });

        if (response.ok) {
          await fetchCart();
          toast({
            title: "Updated",
            description: "Quantity updated successfully",
          });
          return;
        }
      }

      // Fallback: Update local storage
      const currentCart = cart || loadCartFromLocalStorage();
      const updatedItems = currentCart.items.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              quantity: newQuantity,
              total_price: item.unit_price * newQuantity
            } 
          : item
      );
      
      const total_amount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
      const updatedCart = {
        ...currentCart,
        items: updatedItems,
        total_amount,
        item_count: updatedItems.reduce((count, item) => count + item.quantity, 0),
        updated_at: new Date().toISOString()
      };
      
      saveCartToLocalStorage(updatedCart);
      setCart(updatedCart);
      toast({
        title: "Updated",
        description: "Quantity updated successfully",
      });

    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  // Remove item from cart
  const removeItem = async (itemId: number) => {
    setRemoving(itemId);
    try {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        const response = await fetch(`${API_BASE}/api/orders/cart/remove_item/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ item_id: itemId })
        });

        if (response.ok) {
          await fetchCart();
          toast({
            title: "Removed",
            description: "Item removed from cart",
          });
          return;
        }
      }

      // Fallback: Remove from local storage
      const currentCart = cart || loadCartFromLocalStorage();
      const updatedItems = currentCart.items.filter(item => item.id !== itemId);
      const total_amount = updatedItems.reduce((sum, item) => sum + item.total_price, 0);
      const updatedCart = {
        ...currentCart,
        items: updatedItems,
        total_amount,
        item_count: updatedItems.reduce((count, item) => count + item.quantity, 0),
        updated_at: new Date().toISOString()
      };
      
      saveCartToLocalStorage(updatedCart);
      setCart(updatedCart);
      toast({
        title: "Removed",
        description: "Item removed from cart",
      });

    } catch (error) {
      console.error('Error removing item:', error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    } finally {
      setRemoving(null);
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      if (token) {
        const response = await fetch(`${API_BASE}/api/orders/cart/clear/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          await fetchCart();
          toast({
            title: "Cleared",
            description: "Cart cleared successfully",
          });
          return;
        }
      }

      // Fallback: Clear local storage
      const emptyCart = {
        id: 0,
        user: 0,
        items: [],
        total_amount: 0,
        item_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      saveCartToLocalStorage(emptyCart);
      setCart(emptyCart);
      toast({
        title: "Cleared",
        description: "Cart cleared successfully",
      });

    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive",
      });
    }
  };

  // Calculate delivery fee
  const calculateDeliveryFee = (items: CartItem[]): number => {
    if (items.length === 0) return 0;
    return 200; // Fixed delivery fee for demo
  };

  // Filter only gas products for display
  const gasProductItems = cart?.items.filter(item => item.item_type === 'gas_product') || [];

  // Check if any gas product is unavailable
  const hasUnavailableItems = gasProductItems.some(item => 
    item.gas_product_details && 
    (!item.gas_product_details.is_available || !item.gas_product_details.in_stock)
  );

  // Check for low stock items
  const hasLowStockItems = gasProductItems.some(item => 
    item.gas_product_details && 
    item.gas_product_details.in_stock && 
    item.gas_product_details.stock_quantity < 3
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading cart...</p>
        </div>
      </div>
    );
  }

  const subtotal = cart?.total_amount || 0;
  const deliveryFee = calculateDeliveryFee(gasProductItems);
  const total = subtotal + deliveryFee;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-primary text-white shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Gas Cart</h1>
          </div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <span className="text-sm">{gasProductItems.length} items</span>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {gasProductItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🔥</div>
            <h3 className="text-lg font-semibold mb-2">Your gas cart is empty</h3>
            <p className="text-muted-foreground text-center mb-6">
              Add gas products to your cart to get started
            </p>
            <Button onClick={() => navigate("/services/gas")}>
              Browse Gas Products
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Header with Clear Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Gas Products</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCart}
                className="text-destructive hover:text-destructive"
              >
                Clear All
              </Button>
            </div>

            {/* Cart Items */}
            <div className="space-y-3">
              {gasProductItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-4">
                    <div className="flex gap-4">
                      {/* Gas Product Icon */}
                      <div className="w-16 h-16 rounded-lg bg-orange-100 flex items-center justify-center">
                        <span className="text-2xl">🔥</span>
                      </div>
                      
                      {/* Product Details */}
                      <div className="flex-1">
                        <h3 className="font-semibold">
                          {item.gas_product_details?.name || 'Gas Product'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.gas_product_details?.cylinder_size} • {item.gas_product_details?.gas_type?.toUpperCase()}
                        </p>
                        
                        {/* Vendor Info */}
                        {item.gas_product_details && (
                          <>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{item.gas_product_details.vendor_name}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{item.gas_product_details.vendor_contact}</span>
                            </div>
                          </>
                        )}
                        
                        {/* Availability Badge */}
                        {item.gas_product_details && (!item.gas_product_details.is_available || !item.gas_product_details.in_stock) && (
                          <p className="text-xs text-destructive mt-1">
                            Product currently unavailable
                          </p>
                        )}
                        
                        {/* Stock Warning */}
                        {item.gas_product_details?.in_stock && item.gas_product_details.stock_quantity < 5 && (
                          <p className="text-xs text-orange-600 mt-1">
                            Low stock: Only {item.gas_product_details.stock_quantity} left
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-primary">
                            KSh {item.total_price.toLocaleString()}
                          </span>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              disabled={updating === item.id || removing === item.id}
                            >
                              {updating === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Minus className="h-3 w-3" />
                              )}
                            </Button>
                            <span className="w-8 text-center font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={
                                updating === item.id || 
                                removing === item.id || 
                                (item.gas_product_details && (
                                  !item.gas_product_details.is_available ||
                                  !item.gas_product_details.in_stock ||
                                  item.quantity >= item.gas_product_details.stock_quantity
                                ))
                              }
                            >
                              {updating === item.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Plus className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem(item.id)}
                        disabled={removing === item.id}
                      >
                        {removing === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Unit Price */}
                    <div className="mt-2 text-sm text-muted-foreground">
                      Unit price: KSh {item.unit_price.toLocaleString()} each
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Order Summary */}
            <Card className="p-4 sticky bottom-20 shadow-lg">
              <h3 className="font-semibold mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({gasProductItems.length} items)</span>
                  <span>KSh {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Fee</span>
                  <span>KSh {deliveryFee.toLocaleString()}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">KSh {total.toLocaleString()}</span>
                </div>
              </div>
              
              {/* Availability Warnings */}
              {hasUnavailableItems && (
                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">
                    Some items in your cart are currently unavailable. Please remove them to proceed.
                  </p>
                </div>
              )}
              
              {hasLowStockItems && (
                <div className="mt-3 p-3 bg-orange-100 border border-orange-200 rounded-lg">
                  <p className="text-orange-800 text-sm">
                    Some items have low stock. Order soon to avoid disappointment.
                  </p>
                </div>
              )}
              
              <Button 
                className="w-full mt-4 bg-secondary hover:bg-secondary/90"
                size="lg"
                onClick={() => navigate("/checkout", { 
                  state: { 
                    cartItems: gasProductItems,
                    totalAmount: total
                  } 
                })}
                disabled={hasUnavailableItems}
              >
                Proceed to Checkout (KSh {total.toLocaleString()})
              </Button>
            </Card>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Cart;