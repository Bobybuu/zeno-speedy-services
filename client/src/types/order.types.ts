import { GasProduct, Vendor } from './base.types';

export interface OrderItem {
  id?: number;
  product: number;
  quantity: number;
  unit_price: number;
  include_cylinder: boolean;
  item_type?: 'gas_product' | 'service';
  total_price?: number;
  product_details?: GasProduct;
}

export interface Order {
  id: number;
  customer: number;
  vendor: number;
  order_type: 'service' | 'gas_product' | 'mixed';
  service?: number;
  gas_product?: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  delivery_type: 'delivery' | 'pickup' | 'on_site';
  location_lat?: number;
  location_lng?: number;
  delivery_address: string;
  special_instructions: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  commission_rate: number;
  vendor_earnings: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  customer_phone: string;
  customer_email: string;
  estimated_completion_time?: string;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  completed_at?: string;
  tracking?: OrderTracking[];
  order_items?: OrderItem[];
  vendor_details?: Vendor;
  customer_details?: any;
}

export interface OrderTracking {
  id: number;
  order: number;
  status: string;
  note: string;
  created_at: string;
}

export interface CreateOrderData {
  vendor: number;
  items: OrderItem[];
  delivery_address?: string;
  delivery_latitude?: number;
  delivery_longitude?: number;
  special_instructions?: string;
  delivery_type?: string;
}

export interface BulkOrderStatusUpdate {
  order_ids: number[];
  status: string;
  note?: string;
}

export interface BulkOrderStatusUpdateResult {
  message: string;
  results: Array<{
    order_id: number;
    success: boolean;
    new_status?: string;
    error?: string;
  }>;
}