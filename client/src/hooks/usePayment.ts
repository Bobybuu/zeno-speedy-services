// Fix the PaymentStatus type to match your actual usage
export type PaymentStatus = 
  | 'pending' 
  | 'processing' 
  | 'paid' 
  | 'failed' 
  | 'refunded';

// Remove 'idle', 'success', 'completed', 'cancelled' as they don't match your backend