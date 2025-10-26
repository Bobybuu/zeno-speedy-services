import { GasProduct, CheckoutOrderItem } from './base.types';

// Cart Item Types
export interface CartItem {
  id: number;
  item_type: 'gas_product' | 'service';
  gas_product?: number;
  product?: number;
  product_id?: number;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
  added_at: string;
  item_name: string;
  include_cylinder?: boolean;
  gas_product_details?: GasProduct;
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

// Cart Context Types
export interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  addToCart: (productId: number, quantity?: number, includeCylinder?: boolean) => Promise<any>;
  updateCartItem: (itemId: number, quantity: number) => Promise<any>;
  removeFromCart: (itemId: number) => Promise<any>;
  clearCart: () => Promise<any>;
  refreshCart: () => Promise<void>;
  createOrderFromCart: (deliveryAddress: string) => Promise<any>;
  cartItemCount: number;
  cartTotal: number;
}

// Cart API Types
export interface AddToCartPayload {
  product_id: number;
  quantity: number;
  include_cylinder: boolean;
}

export interface UpdateCartItemPayload {
  item_id: number;
  quantity: number;
}

export interface RemoveCartItemPayload {
  item_id: number;
}

// Checkout Types
export interface CheckoutState {
  orderItems: CheckoutOrderItem[];
  totalAmount: number;
  cartData?: Cart;
}

export interface OrderSummary {
  subtotal: number;
  deliveryFee: number;
  total: number;
}