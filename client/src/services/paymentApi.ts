import api from './api';
import { PaymentResponse, PaymentStatusResponse } from '@/types';

export class PaymentApiService {
  async initiatePayment(orderId: number, phoneNumber: string): Promise<PaymentResponse> {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    
    const response = await api.post('/payments/initiate-payment/', {
      order_id: orderId,
      phone_number: formattedPhone,
      payment_method: 'mpesa'
    });
    
    return response.data;
  }

  async checkPaymentStatus(paymentId: number): Promise<PaymentStatusResponse> {
    const response = await api.get(`/payments/${paymentId}/status/`);
    return response.data;
  }

  async verifyPayment(paymentId: number): Promise<PaymentStatusResponse> {
    const response = await api.post(`/payments/${paymentId}/verify/`);
    return response.data;
  }

  async createOrderPayment(orderId: number, paymentMethod: string): Promise<PaymentResponse> {
    const response = await api.post('/payments/create_order_payment/', { 
      order: orderId, 
      payment_method: paymentMethod 
    });
    return response.data;
  }

  // Vendor payout methods
  async getPayoutRequests() {
    const response = await api.get('/payments/payout-requests/');
    return response.data;
  }

  async createPayoutRequest(data: any) {
    const response = await api.post('/payments/payout-requests/', data);
    return response.data;
  }

  async approvePayoutRequest(payoutRequestId: number) {
    const response = await api.post(`/payments/payout-requests/${payoutRequestId}/approve/`);
    return response.data;
  }

  async processPayoutRequest(payoutRequestId: number) {
    const response = await api.post(`/payments/payout-requests/${payoutRequestId}/process/`);
    return response.data;
  }

  async processCommission(paymentId: number, commissionRate?: number) {
    const response = await api.post(`/payments/${paymentId}/process_commission/`, { 
      commission_rate: commissionRate 
    });
    return response.data;
  }

  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    // Support multiple Kenyan phone formats
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254') && cleaned.length === 12) {
      return cleaned;
    } else if (cleaned.startsWith('+254') && cleaned.length === 13) {
      return cleaned.substring(1);
    }
    
    throw new Error('Invalid phone number format. Please use a valid Kenyan phone number (e.g., 0712345678, 254712345678, +254712345678)');
  }
}

export const paymentApiService = new PaymentApiService();

// Legacy export for backward compatibility
export const paymentsAPI = {
  createPayment: (data: any) => api.post('/payments/', data),
  getPayment: (id: number) => api.get(`/payments/${id}/`),
  verifyPayment: (id: number) => paymentApiService.verifyPayment(id),
  createOrderPayment: (orderId: number, paymentMethod: string) => 
    paymentApiService.createOrderPayment(orderId, paymentMethod),
  getPayoutRequests: () => paymentApiService.getPayoutRequests(),
  createPayoutRequest: (data: any) => paymentApiService.createPayoutRequest(data),
  approvePayoutRequest: (payoutRequestId: number) => 
    paymentApiService.approvePayoutRequest(payoutRequestId),
  processPayoutRequest: (payoutRequestId: number) => 
    paymentApiService.processPayoutRequest(payoutRequestId),
  processCommission: (paymentId: number, commissionRate?: number) => 
    paymentApiService.processCommission(paymentId, commissionRate),
};