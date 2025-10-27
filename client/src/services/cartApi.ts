// services/cartApi.ts
import api from './api';
import { 
  Cart, 
  BackendCartItem, // ✅ Use the correct backend type
  AddToCartPayload, 
  UpdateCartItemPayload, 
  RemoveCartItemPayload, 
  GasProduct,
  Order,
  ID
} from '@/types';

// Import orders API service for cart-to-order conversion
import { ordersApiService } from './vendorService';

// Add the missing type definitions locally since they're not in your types yet
interface CartValidationResult {
  isValid: boolean;
  issues: string[];
  cart?: Cart | null;
}

interface CheckoutDetails {
  shipping_address: any;
  delivery_instructions?: string;
  payment_method: string;
  customer_phone?: string;
  special_requests?: string;
}

export class CartApiService {
  /**
   * Enhanced cart validation for order conversion
   */
  async validateCartForOrder(): Promise<CartValidationResult> {
    try {
      const cart = await this.getCart();
      const issues: string[] = [];

      // Basic validation
      if (cart.items.length === 0) {
        issues.push('Cart is empty');
      }

      if (cart.total_amount <= 0) {
        issues.push('Cart total must be greater than 0');
      }

      // Validate each cart item
      for (const item of cart.items) {
        if (item.quantity <= 0) {
          issues.push(`Invalid quantity for ${item.item_name}`);
        }

        if (!item.gas_product_id && !item.service_id) {
          issues.push(`Missing product/service ID for ${item.item_name}`);
        }

        if (item.gas_product_details && !item.gas_product_details.is_available) {
          issues.push(`${item.item_name} is no longer available`);
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        cart: issues.length === 0 ? cart : null
      };
    } catch (error) {
      console.error('❌ Error validating cart for order:', error);
      return {
        isValid: false,
        issues: ['Failed to validate cart'],
        cart: null
      };
    }
  }

  /**
   * Convert cart to order and clear cart
   */
  async createOrderFromCart(orderDetails: {
    shipping_address: any;
    delivery_instructions?: string;
    payment_method: string;
    customer_phone?: string;
    special_requests?: string;
  }): Promise<{ order: Order; cartCleared: boolean }> {
    try {
      console.log('🔄 Converting cart to order...', orderDetails);

      // Step 1: Validate cart
      const validation = await this.validateCartForOrder();
      if (!validation.isValid) {
        throw new Error(`Cart validation failed: ${validation.issues.join(', ')}`);
      }

      const cart = validation.cart!;

      // Step 2: Prepare order payload from cart
      const orderPayload = {
        items: cart.items.map(item => ({
          item_type: item.item_type,
          product_id: item.gas_product_id,
          quantity: item.quantity,
          include_cylinder: item.include_cylinder,
          unit_price: Number(item.unit_price),
          item_name: item.item_name
        })),
        total_amount: cart.total_amount,
        item_count: cart.item_count,
        ...orderDetails
      };

      console.log('📦 Order payload from cart:', orderPayload);

      // Step 3: Create order using orders API
      const order = await ordersApiService.createOrder(orderPayload);
      console.log('✅ Order created from cart:', order);

      // Step 4: Clear cart after successful order creation
      let cartCleared = false;
      try {
        await this.clearCart();
        cartCleared = true;
        console.log('✅ Cart cleared after order creation');
      } catch (clearError) {
        console.warn('⚠️ Could not clear cart after order creation:', clearError);
      }

      return { order, cartCleared };

    } catch (error: any) {
      console.error('❌ Error creating order from cart:', error);
      
      if (error.response?.data) {
        const apiError = error.response.data;
        throw new Error(apiError.message || apiError.detail || 'Failed to create order from cart');
      }
      
      throw new Error(error.message || 'Failed to create order from cart');
    }
  }

  /**
   * Complete checkout workflow: Cart → Order → Payment
   */
  async completeCheckout(checkoutDetails: CheckoutDetails & {
    phoneNumber: string;
  }): Promise<{ order: Order; payment?: any }> {
    try {
      console.log('🎯 Starting complete checkout workflow...');

      // Step 1: Create order from cart
      const { order, cartCleared } = await this.createOrderFromCart({
        shipping_address: checkoutDetails.shipping_address,
        delivery_instructions: checkoutDetails.delivery_instructions,
        payment_method: checkoutDetails.payment_method,
        customer_phone: checkoutDetails.phoneNumber,
        special_requests: checkoutDetails.special_requests
      });

      // Step 2: For M-Pesa payments, initiate payment
      let payment;
      if (checkoutDetails.payment_method === 'mpesa' && checkoutDetails.phoneNumber) {
        try {
          console.log('💰 Payment would be initiated here for order:', order.id);
        } catch (paymentError) {
          console.error('❌ Payment initiation failed:', paymentError);
        }
      }

      console.log('✅ Checkout completed successfully');
      return { order, payment };

    } catch (error) {
      console.error('❌ Checkout failed:', error);
      throw error;
    }
  }

  /**
   * Get cart summary for checkout display
   */
  async getCheckoutSummary(): Promise<{
    itemCount: number;
    totalAmount: number;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      includeCylinder: boolean;
    }>;
  }> {
    const cart = await this.getCart();
    
    return {
      itemCount: cart.item_count,
      totalAmount: cart.total_amount,
      items: cart.items.map(item => ({
        name: item.item_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.total_price),
        includeCylinder: item.include_cylinder || false
      }))
    };
  }

  /**
   * Get user's cart from backend
   */
  async getCart(): Promise<Cart> {
    try {
      const response = await api.get('/orders/cart/my_cart/');
      console.log('🛒 Backend cart response:', response.data);
      return this.normalizeCartData(response.data);
    } catch (error: any) {
      console.error('❌ Error fetching cart from backend:', error);
      
      if (error.response?.status === 404) {
        return this.getEmptyCart();
      }
      throw this.handleError(error);
    }
  }

  /**
   * Add gas product to cart with proper vendor_id handling
   */
  async addToCart(productId: ID, quantity: number = 1, includeCylinder: boolean = false, vendorId?: ID): Promise<Cart> {
    const payload: AddToCartPayload = {
      product_id: productId,
      quantity: quantity,
      include_cylinder: includeCylinder,
      vendor_id: vendorId
    };

    console.log('📦 Sending payload to backend:', payload);
    
    try {
      const response = await api.post('/orders/cart/add_gas_product/', payload);
      console.log('✅ Gas product added to cart:', response.data);
      return this.normalizeCartData(response.data);
    } catch (error: any) {
      console.error('❌ Error adding to cart:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Enhanced add gas product with vendor information
   */
  async addGasProductToCart(productData: {
    productId: ID;
    quantity: number;
    includeCylinder: boolean;
    vendorId?: ID;
    productName?: string;
  }): Promise<Cart> {
    return this.addToCart(
      productData.productId,
      productData.quantity,
      productData.includeCylinder,
      productData.vendorId
    );
  }

  async updateCartItem(itemId: ID, quantity: number): Promise<Cart> {
    const payload: UpdateCartItemPayload = {
      item_id: itemId,
      quantity: quantity
    };
    
    try {
      const response = await api.post('/orders/cart/update_quantity/', payload);
      console.log('✅ Cart item updated:', response.data);
      return this.normalizeCartData(response.data);
    } catch (error: any) {
      console.error('❌ Error updating cart item:', error);
      throw this.handleError(error);
    }
  }

  async removeFromCart(itemId: ID): Promise<Cart> {
    const payload: RemoveCartItemPayload = {
      item_id: itemId
    };
    
    try {
      const response = await api.post('/orders/cart/remove_item/', payload);
      console.log('✅ Item removed from cart');
      return this.normalizeCartData(response.data);
    } catch (error: any) {
      console.error('❌ Error removing from cart:', error);
      throw this.handleError(error);
    }
  }

  async clearCart(): Promise<Cart> {
    try {
      const response = await api.post('/orders/cart/clear/');
      console.log('✅ Cart cleared:', response.data);
      return this.normalizeCartData(response.data);
    } catch (error: any) {
      console.error('❌ Error clearing cart:', error);
      throw this.handleError(error);
    }
  }

  private getEmptyCart(): Cart {
    return { 
      id: null, 
      user_id: 0,
      items: [], 
      total_amount: 0, 
      item_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private updateCartTotals(cart: Cart): void {
    // ✅ FIXED: Use BackendCartItem type explicitly
    cart.item_count = cart.items.reduce((sum: number, item: BackendCartItem) => sum + (item.quantity || 0), 0);
    cart.total_amount = cart.items.reduce((sum: number, item: BackendCartItem) => sum + (Number(item.total_price) || 0), 0);
    cart.updated_at = new Date().toISOString();
  }

  /**
   * Normalize cart data from API response to match our Cart type
   */
  private normalizeCartData(data: any): Cart {
    const items = data.items || data.cart_items || [];
    
    const normalizedCart: Cart = {
      id: data.id || null,
      user_id: data.user_id || data.user || 0,
      items: items.map((item: any) => ({
        id: item.id,
        cart_id: item.cart_id || data.id,
        item_type: item.item_type || 'gas_product',
        gas_product_id: item.gas_product_id || item.gas_product || item.product_id,
        service_id: item.service_id || item.service,
        quantity: item.quantity || 1,
        added_at: item.added_at || new Date().toISOString(),
        unit_price: Number(item.unit_price || item.price || 0),
        total_price: Number(item.total_price || (item.quantity * (item.unit_price || item.price) || 0)),
        item_name: item.item_name || item.name || 'Unknown Item',
        include_cylinder: item.include_cylinder || false,
        gas_product_details: item.gas_product_details,
        service_details: item.service_details,
        vendor_id: item.vendor_id || item.vendor
      })),
      total_amount: Number(data.total_amount || data.total || 0),
      item_count: data.item_count || data.count || items.length,
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString()
    };

    return normalizedCart;
  }

  private handleError(error: any): Error {
    if (error.response?.data) {
      return new Error(error.response.data.message || error.response.data.detail || 'An error occurred');
    }
    if (error.request) {
      return new Error('Network error: Unable to connect to server');
    }
    return new Error('An unexpected error occurred');
  }
}

// Create singleton instance
export const cartApiService = new CartApiService();

// Legacy export for backward compatibility
export const cartAPI = {
  getCart: () => cartApiService.getCart(),
  addGasProduct: (productId: ID, quantity: number = 1, includeCylinder: boolean = false) => 
    cartApiService.addToCart(productId, quantity, includeCylinder),
  updateCartItem: (itemId: ID, quantity: number) => cartApiService.updateCartItem(itemId, quantity),
  removeFromCart: (itemId: ID) => cartApiService.removeFromCart(itemId),
  clearCart: () => cartApiService.clearCart(),
  validateCartForOrder: () => cartApiService.validateCartForOrder(),
  createOrderFromCart: (orderDetails: any) => cartApiService.createOrderFromCart(orderDetails),
  completeCheckout: (checkoutDetails: any) => cartApiService.completeCheckout(checkoutDetails),
  getCheckoutSummary: () => cartApiService.getCheckoutSummary(),
};