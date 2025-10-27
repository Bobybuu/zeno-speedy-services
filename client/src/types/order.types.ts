import { GasProduct, Vendor, ID, Service, BaseEntity } from './base.types';

export interface OrderItem {
  id: ID;
  order_id: ID;
  item_type: 'gas_product' | 'service';
  product_id?: ID;
  service_id?: ID;
  quantity: number;
  unit_price: number;
  total_price: number;
  include_cylinder?: boolean;
  product_details?: GasProduct;
  service_details?: Service;
  vendor_id?: ID;
}

export interface Order extends BaseEntity {
  customer_id: ID;
  vendor_id: ID;
  order_type: 'service' | 'gas_product' | 'mixed';
  service_id?: ID;
  gas_product_id?: ID;
  quantity: number;
  unit_price: number;
  total_amount: number;
  delivery_type: 'delivery' | 'pickup' | 'on_site';
  location_lat?: number;
  location_lng?: number;
  delivery_address: string;
  special_instructions: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  commission_rate: number;
  vendor_earnings: number;
  commission_amount: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  customer_phone: string;
  customer_email: string;
  estimated_completion_time?: string;
  estimated_completion_date?: string;
  confirmed_at?: string;
  completed_at?: string;
  tracking: OrderTracking[];
  order_items: OrderItem[];
  vendor_details?: Vendor;
  customer_details?: any;
  
  // Computed fields
  is_ready_for_payment: boolean;
  can_be_completed: boolean;
  time_since_created: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled' 
  | 'failed';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'failed' 
  | 'refunded' 
  | 'processing';

export interface OrderTracking extends BaseEntity {
  order_id: ID;
  status: OrderStatus;
  note: string;
  created_by?: ID;
  metadata?: any;
}

export interface CreateOrderData {
  vendor_id: ID;
  items: OrderItemPayload[];
  delivery_address: string;
  delivery_latitude: number;
  delivery_longitude: number;
  special_instructions?: string;
  delivery_type: 'delivery' | 'pickup';
  customer_phone: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface OrderItemPayload {
  item_type: 'gas_product' | 'service';
  product_id?: ID;
  service_id?: ID;
  quantity: number;
  unit_price: number;
  include_cylinder?: boolean;
}

export interface BulkOrderStatusUpdate {
  order_ids: ID[];
  status: OrderStatus;
  note?: string;
}

export interface BulkOrderStatusUpdateResult {
  message: string;
  results: Array<{
    order_id: ID;
    success: boolean;
    new_status?: OrderStatus;
    error?: string;
  }>;
}

export interface OrderAnalytics {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  total_commission: number;
  total_vendor_earnings: number;
  average_order_value: number;
  completion_rate: number;
  daily_orders: Array<{
    date: string;
    count: number;
  }>;
  weekly_revenue: Array<{
    week: string;
    revenue: number;
  }>;
}

// ADDED: Order Validation Schemas
export const OrderValidation = {
  validateCreateOrder: (data: CreateOrderData): ValidationResult => {
    const issues: string[] = [];
    
    if (!data.vendor_id) {
      issues.push('Vendor ID is required');
    }
    
    if (!data.items || data.items.length === 0) {
      issues.push('At least one order item is required');
    }
    
    if (!data.delivery_address) {
      issues.push('Delivery address is required');
    }
    
    if (!data.customer_phone) {
      issues.push('Customer phone is required');
    }
    
    data.items.forEach((item, index) => {
      if (!item.item_type) {
        issues.push(`Item ${index + 1}: Item type is required`);
      }
      
      if (item.item_type === 'gas_product' && !item.product_id) {
        issues.push(`Item ${index + 1}: Product ID is required for gas products`);
      }
      
      if (item.item_type === 'service' && !item.service_id) {
        issues.push(`Item ${index + 1}: Service ID is required for services`);
      }
      
      if (!item.quantity || item.quantity < 1) {
        issues.push(`Item ${index + 1}: Quantity must be at least 1`);
      }
      
      if (!item.unit_price || item.unit_price <= 0) {
        issues.push(`Item ${index + 1}: Unit price must be greater than 0`);
      }
    });
    
    return {
      isValid: issues.length === 0,
      issues
    };
  },
  
  validateStatusTransition: (current: OrderStatus, next: OrderStatus): ValidationResult => {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
      failed: []
    };
    
    const isValid = validTransitions[current]?.includes(next) || false;
    
    return {
      isValid,
      issues: isValid ? [] : [`Cannot transition from ${current} to ${next}`]
    };
  }
};

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
}