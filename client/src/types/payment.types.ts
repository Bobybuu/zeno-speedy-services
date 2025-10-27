import { CheckoutOrderItem, ID, BaseEntity } from './base.types';

export interface PaymentResponse {
  message: string;
  checkout_request_id: string;
  payment_id: ID;
  order_id: ID;
}

export interface PaymentStatusResponse {
  status: PaymentStatus;
  payment_id: ID;
  order_id: ID;
  amount: number;
  transaction_id?: string;
  mpesa_receipt_number?: string;
  gateway_response?: any;
}

export interface PaymentState {
  orderItems: CheckoutOrderItem[];
  totalAmount: number;
  cartData?: any;
  paymentMethod: string;
  customerPhone: string;
}

export type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed' | 'cancelled';

export interface PaymentContextType {
  paymentStatus: PaymentStatus;
  currentPayment: Payment | null;
  initiatePayment: (orderId: ID, phoneNumber: string, paymentMethod?: string) => Promise<PaymentResult>;
  checkPaymentStatus: (paymentId: ID) => Promise<PaymentStatusResponse>;
  retryPayment: (paymentId: ID) => Promise<PaymentResult>;
  isProcessing: boolean;
  error: string | null;
  clearError: () => void;
}

export interface PaymentResult {
  success: boolean;
  payment?: Payment;
  error?: string;
  checkout_request_id?: string;
}

export interface Payment extends BaseEntity {
  order_id: ID;
  user_id: ID;
  amount: number;
  currency: string;
  payment_method: 'mpesa' | 'card' | 'cash';
  status: PaymentStatus;
  commission_rate: number;
  commission_amount: number;
  vendor_earnings: number;
  payout_status: 'pending' | 'processed' | 'paid' | 'failed';
  mpesa_receipt_number?: string;
  phone_number: string;
  transaction_date?: string;
  transaction_id?: string;
  payment_gateway_response?: any;
  is_commission_calculated: boolean;
  vendor_payout_ready: boolean;
  vendor_earning_id?: ID;
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

export interface VendorEarning extends BaseEntity {
  vendor_id: ID;
  earning_type: 'order' | 'commission' | 'refund' | 'bonus' | 'adjustment';
  gross_amount: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  status: 'pending' | 'processed' | 'paid' | 'failed' | 'cancelled';
  order_id?: ID;
  payment_id?: ID;
  order_total?: number;
  customer_name?: string;
  description?: string;
  processed_at?: string;
  payout_transaction_id?: ID;
}

export interface VendorPayoutPreference extends BaseEntity {
  vendor_id: ID;
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
}

export interface PayoutTransaction extends BaseEntity {
  vendor_id: ID;
  vendor_name: string;
  payout_method: string;
  payout_reference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  recipient_details: any;
  gateway_response: any;
  initiated_at: string;
  processed_at?: string;
  completed_at?: string;
  description?: string;
  earnings_count: number;
  earnings_total: number;
  fee_amount?: number;
  net_amount: number;
}

// ✅ ADDED: Payment Webhook Types
export interface PaymentWebhook {
  id: ID;
  webhook_type: 'mpesa_stk' | 'mpesa_b2c' | 'mpesa_c2b' | 'card_webhook';
  payload: any;
  headers: Record<string, string>;
  processed_successfully: boolean;
  processing_notes?: string;
  error_message?: string;
  payment_id?: ID;
  payout_transaction_id?: ID;
  created_at: string;
}

export interface MpesaSTKWebhook {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: any;
        }>;
      };
    };
  };
}

export interface MpesaB2CWebhook {
  Result: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID: string;
    ResultParameters?: {
      ResultParameter: Array<{
        Key: string;
        Value: any;
        }>;
    };
    ReferenceData?: {
      ReferenceItem: Array<{
        Key: string;
        Value: any;
      }>;
    };
  };
}

// ✅ ADDED: Payment Validation Schemas
export const PaymentValidation = {
  validatePayment: (payment: Partial<Payment>): ValidationResult => {
    const issues: string[] = [];
    
    if (!payment.order_id) {
      issues.push('Order ID is required');
    }
    
    if (!payment.amount || payment.amount <= 0) {
      issues.push('Amount must be greater than 0');
    }
    
    if (!payment.payment_method) {
      issues.push('Payment method is required');
    }
    
    if (payment.payment_method === 'mpesa' && !payment.phone_number) {
      issues.push('Phone number is required for M-Pesa payments');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  },
  
  validatePayoutPreference: (preference: Partial<VendorPayoutPreference>): ValidationResult => {
    const issues: string[] = [];
    
    if (!preference.payout_method) {
      issues.push('Payout method is required');
    }
    
    if (preference.payout_method === 'mpesa' && !preference.mobile_money_number) {
      issues.push('Mobile money number is required for M-Pesa payouts');
    }
    
    if (preference.payout_method === 'bank_transfer') {
      if (!preference.bank_name) issues.push('Bank name is required');
      if (!preference.account_number) issues.push('Account number is required');
      if (!preference.account_name) issues.push('Account name is required');
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

// ✅ ADDED: Commission Types
export interface CommissionSummary extends BaseEntity {
  period_type: 'daily' | 'weekly' | 'monthly' | 'yearly';
  period_start: string;
  period_end: string;
  total_payments: number;
  total_payment_amount: number;
  total_commission_earned: number;
  total_vendor_payouts: number;
  active_vendors: number;
  vendors_with_payouts: number;
  average_commission_rate: number;
  commission_to_revenue_ratio: number;
}

export interface PayoutRequest extends BaseEntity {
  vendor_id: ID;
  amount: number;
  payout_method: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected' | 'failed';
  recipient_number?: string;
  recipient_name?: string;
  admin_notes?: string;
  processed_by?: ID;
  processed_at?: string;
  completed_at?: string;
  can_be_processed: boolean;
}