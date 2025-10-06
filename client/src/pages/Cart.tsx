import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

interface ServiceImage {
  id: string;
  image: string;
  is_primary: boolean;
}

interface ServiceDetails {
  id: string;
  name: string;
  description: string;
  price: string;
  available: boolean;
  images: ServiceImage[];
  vendor_name: string;
  vendor_type: string;
  vendor_contact: string;
  vendor_address: string;
}

interface CartItem {
  id: string;
  service: string;
  service_details: ServiceDetails;
  quantity: number;
  total_price: string;
  added_at: string;
}

interface Cart {
  id: string;
  items: CartItem[];
  total_amount: string;
  item_count: number;
  created_at: string;
  updated_at: string;
}

const Cart = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  // Fetch cart data from backend
  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/orders/cart/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const cartData = await response.json();
        setCart(cartData);
      } else if (response.status === 404) {
        // Cart doesn't exist yet - create empty cart state
        setCart({
          id: '',
          items: [],
          total_amount: '0',
          item_count: 0,
          created_at: '',
          updated_at: ''
        });
      } else {
        throw new Error('Failed to fetch cart');
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast({
        title: "Error",
        description: "Failed to load cart items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  // Update item quantity
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      await removeItem(itemId);
      return;
    }

    setUpdating(itemId);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/orders/cart/items/${itemId}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: newQuantity })
      });

      if (response.ok) {
        await fetchCart(); // Refresh cart data
        toast({
          title: "Updated",
          description: "Quantity updated successfully",
        });
      } else {
        throw new Error('Failed to update quantity');
      }
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
  const removeItem = async (itemId: string) => {
    setRemoving(itemId);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/orders/cart/items/${itemId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchCart(); // Refresh cart data
        toast({
          title: "Removed",
          description: "Item removed from cart",
        });
      } else {
        throw new Error('Failed to remove item');
      }
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
      const response = await fetch('/api/orders/cart/clear/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchCart(); // Refresh cart data
        toast({
          title: "Cleared",
          description: "Cart cleared successfully",
        });
      } else {
        throw new Error('Failed to clear cart');
      }
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        title: "Error",
        description: "Failed to clear cart",
        variant: "destructive",
      });
    }
  };

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

  const subtotal = parseFloat(cart?.total_amount || '0');
  const deliveryFee = 200; // Fixed delivery fee
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
            <h1 className="text-xl font-semibold">Shopping Cart</h1>
          </div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <span className="text-sm">{cart?.item_count || 0} items</span>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {!cart?.items || cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <ShoppingBag className="h-24 w-24 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Your cart is empty</h3>
            <p className="text-muted-foreground text-center mb-6">
              Add services to your cart to get started
            </p>
            <Button onClick={() => navigate("/services")}>
              Browse Services
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Header with Clear Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Cart Items</h2>
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
              {cart.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-4">
                    <div className="flex gap-4">
                      {/* Service Image */}
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                        {item.service_details.images?.find(img => img.is_primary) ? (
                          <img 
                            src={item.service_details.images.find(img => img.is_primary)?.image} 
                            alt={item.service_details.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">🔧</span>
                        )}
                      </div>
                      
                      {/* Service Details */}
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.service_details.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {item.service_details.vendor_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.service_details.vendor_type}
                        </p>
                        
                        {/* Availability Badge */}
                        {!item.service_details.available && (
                          <p className="text-xs text-destructive mt-1">
                            Service currently unavailable
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-bold text-primary">
                            KSh {parseFloat(item.total_price).toLocaleString()}
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
                              disabled={updating === item.id || removing === item.id || !item.service_details.available}
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
                      Unit price: KSh {parseFloat(item.service_details.price).toLocaleString()} each
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
                  <span className="text-muted-foreground">Subtotal</span>
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
              
              {/* Check Availability */}
              {cart.items.some(item => !item.service_details.available) && (
                <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">
                    Some items in your cart are currently unavailable. Please remove them to proceed.
                  </p>
                </div>
              )}
              
              <Button 
                className="w-full mt-4 bg-secondary hover:bg-secondary/90"
                size="lg"
                onClick={() => navigate("/checkout")}
                disabled={cart.items.some(item => !item.service_details.available)}
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