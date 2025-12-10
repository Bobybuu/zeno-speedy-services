// src/context/CartContext.tsx
import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cartApiService } from '@/services/cartApi';
import { vendorsApiService } from '@/services/vendorService';
import { isAuthenticated } from '@/services/api';

// Types
export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  vendor_id: number;
  vendor_name: string;
  vendor_city: string;
  gas_type?: string;
  cylinder_size?: string;
  price_with_cylinder?: number;
  price_without_cylinder?: number;
  stock_quantity?: number;
  is_available?: boolean;
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  lastSynced?: string;
  isSyncing: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'REMOVE_ITEM'; payload: number }
  | { type: 'UPDATE_QUANTITY'; payload: { id: number; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'LOAD_CART'; payload: CartState }
  | { type: 'SET_SYNCING'; payload: boolean }
  | { type: 'SYNC_SUCCESS'; payload: { items: CartItem[]; lastSynced: string } };

interface CartContextType {
  state: CartState;
  addItem: (item: CartItem) => Promise<void>;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (id: number) => number;
  syncWithBackend: () => Promise<void>;
  validateCartForCheckout: () => { isValid: boolean; issues: string[] };
  validateVendor: (vendorId: number) => Promise<boolean>;
  checkStock: (item: CartItem, quantity: number) => boolean;
  isOnline: boolean;
}

// Initial state
const initialState: CartState = {
  items: [],
  total: 0,
  itemCount: 0,
  isSyncing: false,
};

// Create context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Reducer
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      
      if (existingItem) {
        const updatedItems = state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
        
        const total = updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
        
        return {
          ...state,
          items: updatedItems,
          total,
          itemCount,
        };
      }
      
      const newItems = [...state.items, action.payload];
      const total = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const itemCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      
      return {
        ...state,
        items: newItems,
        total,
        itemCount,
      };
    }
    
    case 'REMOVE_ITEM': {
      const filteredItems = state.items.filter(item => item.id !== action.payload);
      const total = filteredItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const itemCount = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
      
      return {
        ...state,
        items: filteredItems,
        total,
        itemCount,
      };
    }
    
    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        return cartReducer(state, { type: 'REMOVE_ITEM', payload: action.payload.id });
      }
      
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      
      const total = updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const itemCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      
      return {
        ...state,
        items: updatedItems,
        total,
        itemCount,
      };
    }
    
    case 'CLEAR_CART':
      return {
        ...initialState,
        lastSynced: state.lastSynced
      };
      
    case 'LOAD_CART':
      return action.payload;
      
    case 'SET_SYNCING':
      return {
        ...state,
        isSyncing: action.payload
      };
      
    case 'SYNC_SUCCESS':
      const total = action.payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const itemCount = action.payload.items.reduce((sum, item) => sum + item.quantity, 0);
      
      return {
        ...state,
        items: action.payload.items,
        total,
        itemCount,
        lastSynced: action.payload.lastSynced,
        isSyncing: false
      };
      
    default:
      return state;
  }
}

// Provider component
interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Enhanced addItem with validation
  const addItem = async (item: CartItem): Promise<void> => {
    try {
      // 1. Check vendor restriction
      const existingVendorItems = state.items.filter(cartItem => 
        cartItem.vendor_id !== item.vendor_id
      );

      if (existingVendorItems.length > 0 && state.items.length > 0) {
        toast.error('Cannot add items from different vendors. Please clear cart first.');
        return;
      }

      // 2. Validate vendor
      const isVendorValid = await validateVendor(item.vendor_id);
      if (!isVendorValid) {
        toast.error('This vendor is not available. Please choose another vendor.');
        return;
      }

      // 3. Check stock availability
      if (!checkStock(item, item.quantity)) {
        return;
      }

      // 4. Add to local state
      dispatch({ type: 'ADD_ITEM', payload: item });
      toast.success(`${item.name} added to cart`);

      // 5. Sync with backend if authenticated and online
      if (isAuthenticated() && isOnline) {
        await syncWithBackend();
      }

    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const removeItem = (id: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id });
    toast.info('Item removed from cart');
    
    // Sync with backend if authenticated
    if (isAuthenticated() && isOnline) {
      syncWithBackend();
    }
  };

  const updateQuantity = (id: number, quantity: number) => {
    const item = state.items.find(item => item.id === id);
    if (item && !checkStock(item, quantity)) {
      return;
    }
    
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
    
    // Sync with backend if authenticated
    if (isAuthenticated() && isOnline) {
      syncWithBackend();
    }
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
    toast.info('Cart cleared');
    
    // Sync with backend if authenticated
    if (isAuthenticated() && isOnline) {
      syncWithBackend();
    }
  };

  const getItemQuantity = (id: number): number => {
    const item = state.items.find(item => item.id === id);
    return item ? item.quantity : 0;
  };

  // 1. Sync with Backend Cart API
  const syncWithBackend = async (): Promise<void> => {
    if (!isAuthenticated() || state.isSyncing) return;
    
    dispatch({ type: 'SET_SYNCING', payload: true });
    
    try {
      const backendCart = await cartApiService.getCart();
      
      // Merge strategy: Prefer local cart if both have items, otherwise use backend
      let mergedItems: CartItem[] = [];
      
      if (state.items.length > 0 && backendCart.items.length > 0) {
        // Both have items - prefer local cart but validate with backend data
        mergedItems = state.items.map(localItem => {
          const backendItem = backendCart.items.find(bi => 
            bi.gas_product_id === localItem.id || bi.service_id === localItem.id
          );
          
          if (backendItem) {
            // Update local item with backend availability info
            return {
              ...localItem,
              is_available: backendItem.gas_product_details?.is_available ?? localItem.is_available,
              stock_quantity: backendItem.gas_product_details?.stock_quantity ?? localItem.stock_quantity
            };
          }
          return localItem;
        });
      } else if (backendCart.items.length > 0) {
        // Only backend has items - convert backend format to local format
        mergedItems = backendCart.items.map(backendItem => ({
        id: backendItem.gas_product_id || backendItem.service_id || 0,
        name: backendItem.item_name,
        price: Number(backendItem.unit_price),
        quantity: backendItem.quantity,
        // FIXED: Use vendor_id, vendor_name, vendor_city directly instead of vendor_info
        vendor_id: backendItem.vendor_id || 0,
        vendor_name: backendItem.vendor_name || 'Unknown Vendor',
        vendor_city: backendItem.vendor_city || '',
        gas_type: backendItem.gas_product_details?.gas_type,
        cylinder_size: backendItem.gas_product_details?.cylinder_size,
        price_with_cylinder: backendItem.gas_product_details?.price_with_cylinder,
        price_without_cylinder: backendItem.gas_product_details?.price_without_cylinder,
        stock_quantity: backendItem.gas_product_details?.stock_quantity,
        is_available: backendItem.gas_product_details?.is_available
      })).filter(item => item.id !== 0);
      } else {
        // Only local has items or both empty - use local
        mergedItems = state.items;
      }

      dispatch({ 
        type: 'SYNC_SUCCESS', 
        payload: { 
          items: mergedItems,
          lastSynced: new Date().toISOString()
        }
      });
      
      console.log('✅ Cart synced with backend');
      
    } catch (error) {
      console.error('❌ Failed to sync cart with backend:', error);
      // Don't show error toast for sync failures to avoid annoying users
    } finally {
      dispatch({ type: 'SET_SYNCING', payload: false });
    }
  };

  // 2. Enhanced Vendor Validation
  const validateVendor = async (vendorId: number): Promise<boolean> => {
    try {
      const vendor = await vendorsApiService.getVendor(vendorId);
      return vendor.is_active && vendor.is_verified;
    } catch {
      return false;
    }
  };

  // 3. Stock Validation
  const checkStock = (item: CartItem, quantity: number): boolean => {
    if (item.stock_quantity !== undefined && quantity > item.stock_quantity) {
      toast.error(`Only ${item.stock_quantity} units of ${item.name} available`);
      return false;
    }
    
    if (item.is_available === false) {
      toast.error(`${item.name} is currently unavailable`);
      return false;
    }
    
    return true;
  };

  // Cart Validation for Checkout
  const validateCartForCheckout = (): { isValid: boolean; issues: string[] } => {
    const issues: string[] = [];
    
    if (state.items.length === 0) {
      issues.push('Cart is empty');
    }
    
    if (!cartUtils.hasSingleVendor(state.items)) {
      issues.push('Cart contains items from multiple vendors');
    }
    
    // Check product availability and stock
    state.items.forEach(item => {
      if (!item.is_available) {
        issues.push(`${item.name} is no longer available`);
      }
      if (item.stock_quantity !== undefined && item.quantity > item.stock_quantity) {
        issues.push(`Only ${item.stock_quantity} units of ${item.name} available`);
      }
    });
    
    return {
      isValid: issues.length === 0,
      issues
    };
  };

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('zeno-cart');
      if (savedCart) {
        const cartData = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', payload: { ...cartData, isSyncing: false } });
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
  }, []);

  // Save cart to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem('zeno-cart', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }, [state]);

  // Sync with backend on mount if authenticated
  useEffect(() => {
    if (isAuthenticated() && isOnline) {
      syncWithBackend();
    }
  }, [isAuthenticated(), isOnline]);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online - cart will sync');
      if (isAuthenticated()) {
        syncWithBackend();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline - cart changes will sync when back online');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value: CartContextType = {
    state,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity,
    syncWithBackend,
    validateCartForCheckout,
    validateVendor,
    checkStock,
    isOnline,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

// Hook for using cart context
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Utility functions
export const cartUtils = {
  // Calculate total price for a specific vendor
  calculateVendorTotal: (items: CartItem[], vendorId: number): number => {
    return items
      .filter(item => item.vendor_id === vendorId)
      .reduce((total, item) => total + (item.price * item.quantity), 0);
  },

  // Check if all items are from the same vendor
  hasSingleVendor: (items: CartItem[]): boolean => {
    if (items.length === 0) return true;
    const firstVendorId = items[0].vendor_id;
    return items.every(item => item.vendor_id === firstVendorId);
  },

  // Get the vendor ID for the cart (returns null if mixed vendors)
  getCartVendorId: (items: CartItem[]): number | null => {
    if (items.length === 0) return null;
    const firstVendorId = items[0].vendor_id;
    return items.every(item => item.vendor_id === firstVendorId) ? firstVendorId : null;
  },

  // Format price for display
  formatPrice: (price: number): string => {
    return `KSh ${price.toLocaleString()}`;
  },

  // Validate if item can be added to cart (vendor check)
  canAddToCart: (currentItems: CartItem[], newItem: CartItem): boolean => {
    if (currentItems.length === 0) return true;
    const currentVendorId = currentItems[0].vendor_id;
    return currentVendorId === newItem.vendor_id;
  },

  // Convert cart items to order payload
  convertToOrderPayload: (items: CartItem[]) => {
    return {
      items: items.map(item => ({
        item_type: 'gas_product',
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        include_cylinder: !!item.price_with_cylinder
      })),
      vendor_id: items[0]?.vendor_id,
      total_amount: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    };
  }
};

export type { CartContextType };
export default CartContext;