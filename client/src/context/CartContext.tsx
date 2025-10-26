// src/context/CartContext.tsx - COMPLETE FIXED VERSION
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { cartAPI } from '@/services/api';
import { toast } from 'sonner';

// Interfaces
export interface CartItem {
  id: number;
  item_type: string;
  gas_product?: number;
  product?: number;
  product_id?: number;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
  added_at: string;
  item_name: string;
  include_cylinder?: boolean;
  gas_product_details?: any;
  vendor?: number;
}

export interface Cart {
  id: number | null;
  items: CartItem[];
  total_amount: number;
  item_count: number;
  created_at: string;
  updated_at: string;
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  addToCart: (productId: number, quantity?: number, includeCylinder?: boolean) => Promise<any>;
  updateCartItem: (itemId: number, quantity: number) => Promise<any>;
  removeFromCart: (itemId: number) => Promise<any>;
  clearCart: () => Promise<any>;
  refreshCart: () => Promise<void>;
  createOrderFromCart: (deliveryAddress: string) => Promise<any>;
  
  // ✅ ADDED: Computed properties for cart summary
  cartItemCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// ✅ IMPROVED: Cart normalization function with better unit price handling
const normalizeCartData = (cartData: any): Cart => {
  if (!cartData) {
    return {
      id: null,
      items: [],
      total_amount: 0,
      item_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  console.log('🛒 Normalizing cart data:', cartData);

  // Handle different response formats
  const items = Array.isArray(cartData.items) ? cartData.items : (cartData.cart_items || []);
  
  console.log('🛒 Raw items from API:', items);

  // ✅ IMPROVED: Better gas product detection and normalization with unit price fix
  const normalizedItems = items.map((item: any) => {
    // ✅ FIX: Detect gas products more accurately
    const isGasProduct = 
      item.item_type === 'gas_product' || 
      item.gas_product !== undefined ||
      (item.gas_product_details && Object.keys(item.gas_product_details).length > 0) ||
      (item.item_name && item.item_name.toLowerCase().includes('gas')) ||
      (item.product_id && item.product_id > 0);

    // ✅ FIX: Calculate unit price if it's missing or 0
    let unitPrice = typeof item.unit_price === 'string' ? 
      parseFloat(item.unit_price) : (Number(item.unit_price) || 0);
    
    const totalPriceValue = typeof item.total_price === 'string' ? 
      parseFloat(item.total_price) : (Number(item.total_price) || 0);
    
    const quantityValue = Number(item.quantity) || 1;
    
    // If unit price is 0 but we have total price and quantity, calculate it
    if (unitPrice === 0 && totalPriceValue > 0 && quantityValue > 0) {
      unitPrice = totalPriceValue / quantityValue;
      console.log(`🔄 Calculated unit price for item ${item.id}:`, {
        totalPrice: totalPriceValue,
        quantity: quantityValue,
        calculatedUnitPrice: unitPrice
      });
    }

    // ✅ CRITICAL FIX: Ensure item_type is NEVER null/undefined
    const itemType = isGasProduct ? 'gas_product' : (item.item_type || 'service');

    const normalizedItem = {
      id: item.id || 0,
      item_type: itemType, // ✅ ALWAYS set a valid item_type
      gas_product: item.gas_product || item.product_id || item.product,
      product: item.product || item.product_id || item.gas_product,
      product_id: item.product_id || item.gas_product || item.product,
      quantity: quantityValue,
      unit_price: unitPrice,
      total_price: totalPriceValue,
      added_at: item.added_at || item.created_at || new Date().toISOString(),
      item_name: item.item_name || 'Gas Product',
      include_cylinder: Boolean(item.include_cylinder),
      gas_product_details: item.gas_product_details || item.product_details || null,
      vendor: item.vendor || (item.gas_product_details?.vendor || 1)
    };

    console.log(`🛒 Normalized item ${normalizedItem.id}:`, {
      original_type: item.item_type,
      normalized_type: normalizedItem.item_type,
      isGasProduct,
      gas_product: normalizedItem.gas_product,
      unit_price: normalizedItem.unit_price,
      total_price: normalizedItem.total_price,
      quantity: normalizedItem.quantity
    });

    return normalizedItem;
  });

  const total_amount = typeof cartData.total_amount === 'string' ? 
    parseFloat(cartData.total_amount) : 
    (Number(cartData.total_amount) || 0);

  const item_count = Number(cartData.item_count) || normalizedItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

  const normalizedCart: Cart = {
    id: cartData.id || null,
    items: normalizedItems,
    total_amount: total_amount,
    item_count: item_count,
    created_at: cartData.created_at || new Date().toISOString(),
    updated_at: cartData.updated_at || new Date().toISOString()
  };

  console.log('🛒 Normalized cart object:', normalizedCart);
  return normalizedCart;
};

// ✅ ADDED: Network Debugger Component
const NetworkDebugger: React.FC = () => {
  useEffect(() => {
    // Override fetch to log all requests
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      console.log('🌐 Fetch request:', args[0], args[1]);
      try {
        const response = await originalFetch(...args);
        console.log('🌐 Fetch response:', response.url, response.status);
        return response;
      } catch (error) {
        console.error('🌐 Fetch error:', error);
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ ADDED: Computed properties for cart summary
  const cartItemCount = useMemo(() => {
    if (!cart?.items) return 0;
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  }, [cart?.items]);

  const cartTotal = useMemo(() => {
    if (!cart?.total_amount) return 0;
    return typeof cart.total_amount === 'string' 
      ? parseFloat(cart.total_amount) 
      : cart.total_amount;
  }, [cart?.total_amount]);

  // Debug cart state changes
  useEffect(() => {
    console.log('🔄 Cart state updated:', { 
      cart, 
      loading, 
      cartItemCount, 
      cartTotal 
    });
  }, [cart, loading, cartItemCount, cartTotal]);

  // ✅ IMPROVED: Refresh cart function with better error handling
  const refreshCart = async (): Promise<void> => {
    console.log('🔄 refreshCart called');
    try {
      setLoading(true);
      const cartData = await cartAPI.getCart();
      console.log('📦 Raw cart data from API:', cartData);
      
      const normalizedCart = normalizeCartData(cartData);
      console.log('✨ Normalized cart:', normalizedCart);
      
      setCart(normalizedCart);
    } catch (error) {
      console.error('❌ Error refreshing cart:', error);
      // Set empty cart on error
      setCart({
        id: null,
        items: [],
        total_amount: 0,
        item_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } finally {
      setLoading(false);
      console.log('✅ refreshCart completed, loading set to false');
    }
  };

  // ✅ ENHANCED: Add to cart function with detailed debugging
  const addToCart = async (productId: number, quantity: number = 1, includeCylinder: boolean = false): Promise<any> => {
    try {
      console.log('🛒 Adding product to cart:', { productId, quantity, includeCylinder });
      
      // ✅ Use the CORRECT API method with proper parameters
      const response = await cartAPI.addGasProduct(productId, quantity, includeCylinder);
      
      console.log('✅ Product added to cart successfully:', response);
      
      // ✅ CRITICAL: Wait a bit before refreshing to ensure backend has processed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh the cart to get updated data
      await refreshCart();
      
      toast.success('Product added to cart!');
      return response;
    } catch (error: any) {
      console.error('❌ Error adding to cart:', error);
      
      // ✅ Enhanced error handling with specific messages
      let errorMessage = 'Failed to add product to cart';
      
      if (error.response?.status === 405) {
        errorMessage = 'Cart endpoint not available. Please try again.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Product not found or unavailable.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.error || 'Invalid request. Please check product availability.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast.error(errorMessage);
      throw error;
    }
  };

  // ✅ FIXED: Update cart item quantity
  const updateCartItem = async (itemId: number, quantity: number): Promise<any> => {
    try {
      console.log('🔄 Updating cart item:', { itemId, quantity });
      
      if (quantity < 1) {
        // If quantity is 0 or less, remove the item
        return await removeFromCart(itemId);
      }

      // ✅ Use the CORRECT API method
      const response = await cartAPI.updateCartItem(itemId, quantity);
      console.log('✅ Cart item updated successfully:', response);
      
      // Refresh cart to get updated data
      await refreshCart();
      
      return response;
    } catch (error: any) {
      console.error('❌ Error updating cart item:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to update cart item';
      toast.error(errorMessage);
      throw error;
    }
  };

  // ✅ FIXED: Remove item from cart with simplified approach
  const removeFromCart = async (itemId: number): Promise<any> => {
    try {
      setLoading(true);
      console.log('🗑️ Removing item from cart:', itemId);
      
      // ✅ Use the CORRECT API method - cartAPI.removeFromCart now handles the endpoint internally
      const response = await cartAPI.removeFromCart(itemId);
      console.log('✅ Item removed from cart successfully:', response);
      
      // Refresh cart to get updated data
      await refreshCart();
      
      return response;
    } catch (error: any) {
      console.error('❌ Error removing item from cart:', error);
      
      let errorMessage = 'Failed to remove item from cart';
      
      if (error.response?.status === 404) {
        errorMessage = 'Item not found. It may have already been removed.';
        // Refresh cart to sync with server state
        await refreshCart();
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Clear entire cart
  const clearCart = async (): Promise<any> => {
    try {
      console.log('🧹 Clearing entire cart');
      
      const response = await cartAPI.clearCart();
      console.log('✅ Cart cleared successfully:', response);
      
      // Refresh cart to get updated empty state
      await refreshCart();
      
      return response;
    } catch (error: any) {
      console.error('❌ Error clearing cart:', error);
      
      const errorMessage = error.response?.data?.message || 'Failed to clear cart';
      toast.error(errorMessage);
      throw error;
    }
  };

  // ✅ COMPLETELY FIXED: Create order from cart with proper item structure
  const createOrderFromCart = async (deliveryAddress: string): Promise<any> => {
    try {
      console.log('🛒 Creating order from cart...');
      console.log('🛒 Current cart state:', cart);
      
      // ✅ Better empty cart check
      if (!cart || !cart.items || cart.items.length === 0) {
        const errorMsg = 'Cart is empty. Please add items to your cart before ordering.';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }
      
      // ✅ FIXED: Better gas product detection
      const gasProductItems = cart.items.filter((item: CartItem) => {
        const isGasProduct = 
          item.item_type === 'gas_product' || 
          item.gas_product !== undefined ||
          (item.gas_product_details && Object.keys(item.gas_product_details).length > 0);
        
        console.log(`🛒 Item ${item.id} gas detection:`, {
          item_type: item.item_type,
          isGasProduct
        });
        
        return isGasProduct;
      });

      if (gasProductItems.length === 0) {
        const errorMsg = 'No gas products found in cart. Please add gas products to proceed.';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('✅ Creating order with gas product items:', gasProductItems);

      // ✅ CRITICAL FIX: Transform items with proper structure for backend
      const orderItems = gasProductItems.map((item: CartItem) => {
        const unitPriceNum = typeof item.unit_price === 'string' ? 
          parseFloat(item.unit_price) : Number(item.unit_price);
        const totalPriceNum = typeof item.total_price === 'string' ? 
          parseFloat(item.total_price) : Number(item.total_price);
        
        const calculatedUnitPrice = unitPriceNum > 0 
          ? unitPriceNum
          : totalPriceNum / Number(item.quantity);

        // ✅ CRITICAL FIX: Use the EXACT structure backend expects
        const orderItem = {
          product: item.gas_product || item.product_id,
          quantity: item.quantity,
          unit_price: calculatedUnitPrice,
          include_cylinder: item.include_cylinder || false,
          // ✅ EXPLICITLY SET item_type - this is what the backend wants
          item_type: 'gas_product' // Hardcoded to ensure it's never null
        };

        console.log(`🛒 Transformed order item ${item.id}:`, orderItem);
        return orderItem;
      });

      // Get vendor from first item
      const vendorId = gasProductItems[0]?.vendor || 1;

      // ✅ CRITICAL FIX: Complete order payload with all required fields
      const orderData = {
        vendor: vendorId,
        items: orderItems,
        delivery_address: deliveryAddress,
        delivery_latitude: 0, // You might want to get actual coordinates
        delivery_longitude: 0,
        special_instructions: '',
        // ✅ REQUIRED FIELD:
        delivery_type: 'delivery' // or 'pickup' based on user selection
      };

      console.log('📦 FINAL Order payload:', JSON.stringify(orderData, null, 2));

      // Import ordersAPI here to avoid circular dependency
      const { ordersAPI } = await import('@/services/api');
      console.log('🚀 Sending order creation request...');
      
      try {
        const response = await ordersAPI.createOrder(orderData);
        console.log('✅ Order created successfully:', response.data);
        
        // Clear cart after successful order creation
        await clearCart();
        
        return response.data;
      } catch (apiError: any) {
        console.error('❌ API Error details:', {
          status: apiError.response?.status,
          data: apiError.response?.data,
        });
        
        // Log backend validation errors
        if (apiError.response?.data) {
          console.error('❌ Backend validation errors:', JSON.stringify(apiError.response.data, null, 2));
        }
        
        throw apiError;
      }
    } catch (error: any) {
      console.error('❌ Error creating order from cart:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response,
        data: error.response?.data,
        status: error.response?.status
      });
      
      // Provide more specific error messages
      if (error.message.includes('empty')) {
        throw new Error('Your cart is empty. Please add items before ordering.');
      } else if (error.message.includes('MULTI_VENDOR_ERROR')) {
        throw new Error('Your cart contains items from different vendors. Please order from one vendor at a time.');
      } else if (error.response?.status === 400) {
        const backendError = error.response.data;
        console.error('❌ Backend validation error:', backendError);
        
        // ✅ IMPROVED: More specific error messages based on backend response
        if (backendError.items && backendError.items.includes('Invalid item type: None')) {
          throw new Error('Cart items have invalid types. Please refresh your cart and try again.');
        }
        
        throw new Error(backendError.detail || backendError.error || 'Invalid order data. Please check your cart items.');
      } else {
        throw new Error('Failed to create order. Please try again.');
      }
    }
  };

  // ✅ ADDED: Debug function to check cart items before order creation
  const debugCartItems = () => {
    if (!cart?.items) {
      console.log('🛒 No cart items found');
      return;
    }
    
    console.log('🔍 DEBUG - Cart Items Analysis:');
    cart.items.forEach((item: CartItem, index: number) => {
      console.log(`Item ${index}:`, {
        id: item.id,
        item_type: item.item_type,
        gas_product: item.gas_product,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        include_cylinder: item.include_cylinder,
        gas_product_details: item.gas_product_details
      });
    });
  };

  // ✅ ADDED: Test function to manually add items to cart
  const testAddToCart = async () => {
    try {
      console.log('🧪 Testing cart addition...');
      
      // Use a known product ID (like 6 from your previous attempts)
      const testProductId = 6;
      const testQuantity = 1;
      const includeCylinder = false;
      
      console.log('🧪 Test parameters:', { testProductId, testQuantity, includeCylinder });
      
      await addToCart(testProductId, testQuantity, includeCylinder);
      
      console.log('✅ Test cart addition completed');
    } catch (error) {
      console.error('❌ Test cart addition failed:', error);
    }
  };

  // Initialize cart on component mount
  useEffect(() => {
    const initializeCart = async () => {
      console.log('🚀 Initializing cart...');
      await refreshCart();
      
      // Check if user is authenticated and sync localStorage cart if needed
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          await cartAPI.syncLocalStorageCart();
        } catch (error) {
          console.error('Error syncing localStorage cart:', error);
        }
      }
    };

    initializeCart();
  }, []);

  const value: CartContextType = {
    cart,
    loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart,
    createOrderFromCart,
    // ✅ ADDED: Computed properties
    cartItemCount,
    cartTotal
  };

  return (
    <CartContext.Provider value={value}>
      <NetworkDebugger />
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export default CartContext;