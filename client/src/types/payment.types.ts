import { CheckoutOrderItem } from './base.types';

export interface PaymentResponse {
  message: string;
  checkout_request_id: string;
  payment_id: number;
}

export interface PaymentStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_id: number;
  order_id: number;
  amount?: number;
}

export interface PaymentState {
  orderItems: CheckoutOrderItem[];
  totalAmount: number;
  cartData?: any;
}

export type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed';

export interface PaymentContextType {
  paymentStatus: PaymentStatus;
  initiatePayment: (orderId: number, phoneNumber: string) => Promise<void>;
  isProcessing: boolean;
  error: string | null;
  retryPayment: () => void;
}

// Vendor Dashboard Payment Types
export interface VendorDashboardAnalytics {
  total_earnings: number;
  available_balance: number;
  pending_payouts: number;
  total_paid_out: number;
  next_payout_amount: number;
  total_orders_count: number;
  completed_orders_count: number;
  order_completion_rate: number;
  active_customers_count: number;
  total_gas_products: number;
  available_gas_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  commission_rate: number;
  average_commission: number;
  has_payout_preference: boolean;
  payout_preference?: VendorPayoutPreference;
  recent_earnings: VendorEarning[];
  recent_payouts: PayoutTransaction[];
  business_name: string;
  average_rating: number;
  total_reviews: number;
  is_verified: boolean;
}

export interface VendorEarning {
  id: number;
  earning_type: 'order' | 'commission' | 'refund' | 'bonus';
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  status: 'pending' | 'processed' | 'paid' | 'failed';
  order_id?: number;
  order_total?: number;
  customer_name?: string;
  description?: string;
  created_at: string;
  processed_at?: string;
}

export interface VendorPayoutPreference {
  id: number;
  payout_method: 'mpesa' | 'bank_transfer' | 'cash';
  mobile_money_number?: string;
  mobile_money_name?: string;
  bank_name?: string;
  bank_type?: string;
  account_number?: string;
  account_name?: string;
  branch_code?: string;
  swift_code?: string;
  is_verified: boolean;
  verification_document?: string;
  auto_payout: boolean;
  payout_threshold: number;
  payout_details_summary: string;
  created_at: string;
  updated_at: string;
}

export interface PayoutTransaction {
  id: number;
  vendor: number;
  vendor_name: string;
  payout_method: string;
  payout_reference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recipient_details: any;
  gateway_response: any;
  initiated_at: string;
  processed_at?: string;
  completed_at?: string;
  description?: string;
  earnings_count?: number;
  earnings_total?: number;
}