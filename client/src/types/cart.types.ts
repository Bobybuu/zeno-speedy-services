import { GasProduct, CheckoutOrderItem, ID, Service, BaseEntity } from './base.types';

// Cart State Types (matching your actual implementation)
export interface CartItem {
  id: ID;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  vendor_id: ID;
  vendor_name: string;
  vendor_city: string;
  gas_type?: string;
  cylinder_size?: string;
  price_with_cylinder?: number;
  price_without_cylinder?: number;
  stock_quantity?: number;
  is_available?: boolean;
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  lastSynced?: string;
  isSyncing: boolean;
}

// Cart Context Type (MATCHING YOUR ACTUAL IMPLEMENTATION)
export interface CartContextType {
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

// Keep the existing backend Cart types for API compatibility
export interface BackendCartItem {
  id: ID;
  cart_id: ID;
  item_type: 'gas_product' | 'service';
  gas_product_id?: ID;
  service_id?: ID;
  quantity: number;
  added_at: string;
  unit_price: number;
  total_price: number;
  item_name: string;
  include_cylinder?: boolean;
  gas_product_details?: GasProduct;
  service_details?: Service;
  vendor_id?: ID;
  vendor_name?: string;
  vendor_city?: string;
}

export interface BackendCart extends BaseEntity {
  user_id: ID;
  items: BackendCartItem[];
  total_amount: number;
  item_count: number;
}

// Cart API Types
export interface AddToCartPayload {
  product_id: ID;
  quantity: number;
  include_cylinder: boolean;
  vendor_id?: ID;
}

export interface AddServiceToCartPayload {
  service_id: ID;
  quantity: number;
  vendor_id?: ID;
}

export interface UpdateCartItemPayload {
  item_id: ID;
  quantity: number;
}

export interface RemoveCartItemPayload {
  item_id: ID;
}

// Checkout Types
export interface CheckoutState {
  orderItems: CheckoutOrderItem[];
  totalAmount: number;
  cartData?: BackendCart;
  shippingAddress?: ShippingAddress;
  paymentMethod: string;
}

export interface ShippingAddress {
  address: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  contact_phone?: string;
  special_instructions?: string;
}

export interface OrderSummary {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  vendorEarnings: number;
  commission: number;
}

export interface CartValidationResult {
  isValid: boolean;
  issues: string[];
  cart?: BackendCart | null;
  stockIssues?: Array<{
    itemId: ID;
    productName: string;
    availableStock: number;
    requestedQuantity: number;
  }>;
  priceIssues?: Array<{
    itemId: ID;
    productName: string;
    originalPrice: number;
    currentPrice: number;
  }>;
}

export interface CheckoutDetails {
  shipping_address: ShippingAddress;
  delivery_instructions?: string;
  payment_method: string;
  customer_phone: string;
  special_requests?: string;
}

// Order Creation Types
export interface OrderItemPayload {
  product?: ID;
  service?: ID;
  quantity: number;
  unit_price: number;
  include_cylinder?: boolean;
  item_type: 'gas_product' | 'service';
}

export interface CreateOrderPayload {
  vendor_id?: ID;
  items: OrderItemPayload[];
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  special_instructions?: string;
  delivery_type: 'delivery' | 'pickup';
  customer_phone: string;
}

export interface OrderCreationResult {
  success: boolean;
  order?: any;
  error?: CartError;
  validation_issues?: string[];
}

// Vendor-related Types
export interface VendorInfo {
  id: ID;
  business_name: string;
  business_type: string;
  city: string;
  address: string;
  contact_number?: string;
  latitude?: number;
  longitude?: number;
  is_verified: boolean;
}

// Cart Normalization Types
export interface RawCartItem {
  id?: ID;
  item_type?: string;
  gas_product?: ID;
  service?: ID;
  product?: ID;
  product_id?: ID;
  quantity?: number;
  unit_price?: string | number;
  total_price?: string | number;
  added_at?: string;
  item_name?: string;
  include_cylinder?: boolean;
  gas_product_details?: any;
  service_details?: any;
  vendor?: ID;
  vendor_id?: ID;
}

export interface RawCartData {
  id?: ID;
  items?: RawCartItem[];
  cart_items?: RawCartItem[];
  total_amount?: string | number;
  item_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Cart Error Types
export interface CartError {
  code: CartErrorCode;
  message: string;
  details?: any;
  retryable: boolean;
  item_id?: ID;
}

export type CartErrorCode = 
  | 'INSUFFICIENT_STOCK'
  | 'PRODUCT_UNAVAILABLE'
  | 'PRICE_CHANGED'
  | 'VENDOR_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

export interface CartOperationResult {
  success: boolean;
  data?: any;
  error?: CartError;
  validation_issues?: string[];
}

// Cart Analytics Types
export interface CartAnalytics {
  totalItems: number;
  totalValue: number;
  itemTypes: {
    gas_product: number;
    service: number;
  };
  vendorBreakdown: Record<ID, {
    count: number;
    value: number;
    vendor_name: string;
  }>;
  averageItemValue: number;
  mostAddedProduct?: {
    productId: ID;
    productName: string;
    count: number;
  };
}

// Cart Sync Types
export interface LocalStorageCart {
  items: CartItem[];
  timestamp: number;
  version: string;
  cart_id?: ID;
}

export interface CartSyncResult {
  synced: boolean;
  localItems: number;
  serverItems: number;
  conflicts: CartItem[];
  mergedItems: CartItem[];
}

// Cart Validation Schemas - FIXED: Use BackendCartItem for validation
export const BackendCartItemSchema = {
  validate: (item: BackendCartItem): ValidationResult => {
    const issues: string[] = [];
    
    if (!item.item_type || !['gas_product', 'service'].includes(item.item_type)) {
      issues.push('Invalid item type');
    }
    
    if (!item.quantity || item.quantity < 1) {
      issues.push('Quantity must be at least 1');
    }
    
    if (item.item_type === 'gas_product' && !item.gas_product_id) {
      issues.push('Gas product ID is required for gas products');
    }
    
    if (item.item_type === 'service' && !item.service_id) {
      issues.push('Service ID is required for services');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
};

// Simple CartItem validation for frontend context
export const CartItemSchema = {
  validate: (item: CartItem): ValidationResult => {
    const issues: string[] = [];
    
    if (!item.name) {
      issues.push('Item name is required');
    }
    
    if (!item.quantity || item.quantity < 1) {
      issues.push('Quantity must be at least 1');
    }
    
    if (!item.price || item.price <= 0) {
      issues.push('Price must be greater than 0');
    }
    
    if (!item.vendor_id) {
      issues.push('Vendor ID is required');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
};

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
}

// Utility functions type
export interface CartUtils {
  calculateVendorTotal: (items: CartItem[], vendorId: number) => number;
  hasSingleVendor: (items: CartItem[]) => boolean;
  getCartVendorId: (items: CartItem[]) => number | null;
  formatPrice: (price: number) => string;
  canAddToCart: (currentItems: CartItem[], newItem: CartItem) => boolean;
  convertToOrderPayload: (items: CartItem[]) => any;
}