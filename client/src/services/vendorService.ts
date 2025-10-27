// services/vendorService.ts
import api from './api';
import { paymentApiService } from './paymentApi'; // ✅ Add this import
import { 
  Vendor, 
  VendorFilters, 
  VendorCreateData, 
  VendorUpdateData, 
  VendorReviewData, 
  OperatingHoursData,
  GasProduct,
  GasProductFilters,
  GasProductCreateData,
  GasProductUpdateData,
  OrderFilters,
  BulkOrderStatusUpdate,
  VendorDashboardAnalytics,
  VendorEarning,
  VendorPayoutPreference,
  PayoutTransaction
} from '@/types';

export class VendorsApiService {
  // Vendor management
  async getVendors(filters?: VendorFilters): Promise<{ count: number; results: Vendor[] }> {
    const response = await api.get('/vendors/vendors/', { params: filters });
    return response.data;
  }

  async getVendor(id: number): Promise<Vendor> {
    const response = await api.get(`/vendors/vendors/${id}/`);
    return response.data;
  }

  async getMyVendor(): Promise<Vendor> {
    const response = await api.get('/vendors/vendors/my_vendor/');
    return response.data;
  }

  async registerVendor(data: VendorCreateData): Promise<Vendor> {
    const response = await api.post('/vendors/vendors/', data);
    return response.data;
  }

  async updateVendor(id: number, data: VendorUpdateData): Promise<Vendor> {
    const response = await api.patch(`/vendors/vendors/${id}/`, data);
    return response.data;
  }

  // Vendor Dashboard & Analytics
  async getVendorDashboard(): Promise<VendorDashboardAnalytics> {
    const response = await api.get('/vendors/vendors/my_vendor/vendor_dashboard/');
    return response.data;
  }

  async getVendorDashboardAnalytics(): Promise<VendorDashboardAnalytics> {
    const response = await api.get('/vendors/vendors/my_vendor/vendor_dashboard_analytics/');
    return response.data;
  }

  async getVendorStats() {
    const response = await api.get('/vendors/vendors/vendor_stats/');
    return response.data;
  }

  async getOrderAnalytics(period?: string) {
    const response = await api.get('/vendors/vendors/my_vendor/order_analytics/', { 
      params: { period } 
    });
    return response.data;
  }

  async updatePerformanceMetrics() {
    const response = await api.post('/vendors/vendors/my_vendor/update_performance_metrics/');
    return response.data;
  }

  // Vendor Earnings & Payouts
  async getEarnings(filters?: { type?: string; status?: string; date_from?: string; date_to?: string }): Promise<VendorEarning[]> {
    const response = await api.get('/vendors/vendors/my_vendor/earnings/', { params: filters });
    return response.data;
  }

  async getPayoutHistory(): Promise<PayoutTransaction[]> {
    const response = await api.get('/vendors/vendors/my_vendor/payout_history/');
    return response.data;
  }

  // Payout Preferences
  async getPayoutPreferences(): Promise<VendorPayoutPreference> {
    const response = await api.get('/vendors/vendors/my_vendor/payout_preferences/');
    return response.data;
  }

  async updatePayoutPreferences(data: any): Promise<VendorPayoutPreference> {
    const response = await api.put('/vendors/vendors/my_vendor/payout_preferences/', data);
    return response.data;
  }

  // Vendor location and discovery
  async getNearbyVendors(lat: number, lng: number, radius: number = 10, business_type?: string): Promise<Vendor[]> {
    const response = await api.get('/vendors/vendors/nearby_vendors/', { 
      params: { lat, lng, radius, business_type } 
    });
    return response.data;
  }

  async getVendorWithProducts(id: number): Promise<Vendor & { products: GasProduct[] }> {
    const response = await api.get(`/vendors/vendors/${id}/vendor_with_products/`);
    return response.data;
  }

  // Reviews
  async getVendorReviews(vendorId: number) {
    const response = await api.get(`/vendors/reviews/vendor_reviews/?vendor=${vendorId}`);
    return response.data;
  }

  async createReview(vendorId: number, data: VendorReviewData) {
    const response = await api.post('/vendors/reviews/', { ...data, vendor: vendorId });
    return response.data;
  }

  async updateReview(reviewId: number, data: VendorReviewData) {
    const response = await api.put(`/vendors/reviews/${reviewId}/`, data);
    return response.data;
  }

  async deleteReview(reviewId: number) {
    const response = await api.delete(`/vendors/reviews/${reviewId}/`);
    return response.data;
  }

  // Operating hours
  async getOperatingHours(vendorId: number) {
    const response = await api.get('/vendors/operating-hours/', { params: { vendor: vendorId } });
    return response.data;
  }

  async createOperatingHours(data: OperatingHoursData) {
    const response = await api.post('/vendors/operating-hours/', data);
    return response.data;
  }

  async updateOperatingHours(id: number, data: OperatingHoursData) {
    const response = await api.put(`/vendors/operating-hours/${id}/`, data);
    return response.data;
  }

  async deleteOperatingHours(id: number) {
    const response = await api.delete(`/vendors/operating-hours/${id}/`);
    return response.data;
  }
}

export class GasProductsApiService {
  // Product management
  async getGasProducts(filters?: GasProductFilters): Promise<{ count: number; results: GasProduct[] }> {
    const response = await api.get('/vendors/gas-products/', { params: filters });
    return response.data;
  }

  async getGasProduct(id: number): Promise<GasProduct> {
    const response = await api.get(`/vendors/gas-products/${id}/`);
    return response.data;
  }

  async createGasProduct(data: GasProductCreateData): Promise<GasProduct> {
    const response = await api.post('/vendors/gas-products/', data);
    return response.data;
  }

  async updateGasProduct(id: number, data: GasProductUpdateData): Promise<GasProduct> {
    const response = await api.patch(`/vendors/gas-products/${id}/`, data);
    return response.data;
  }

  async deleteGasProduct(id: number): Promise<void> {
    await api.delete(`/vendors/gas-products/${id}/`);
  }

  // Vendor-specific products
  async getMyProducts(): Promise<GasProduct[]> {
    const response = await api.get('/vendors/gas-products/my_products/');
    return response.data;
  }

  // Product actions
  async updateStock(id: number, stockQuantity: number, minStockAlert?: number): Promise<GasProduct> {
    const response = await api.patch(`/vendors/gas-products/${id}/update_stock/`, { 
      stock_quantity: stockQuantity, 
      min_stock_alert: minStockAlert 
    });
    return response.data;
  }

  async toggleAvailability(id: number): Promise<GasProduct> {
    const response = await api.post(`/vendors/gas-products/${id}/toggle_availability/`);
    return response.data;
  }

  // Product discovery
  async getFeaturedProducts(): Promise<GasProduct[]> {
    const response = await api.get('/vendors/gas-products/featured_products/');
    return response.data;
  }

  async searchProducts(query: string, filters?: GasProductFilters): Promise<{ count: number; results: GasProduct[] }> {
    const response = await api.get('/vendors/gas-products/search_products/', { 
      params: { search: query, ...filters } 
    });
    return response.data;
  }

  // Product images
  async uploadProductImage(productId: number, imageFile: File, altText?: string, isPrimary?: boolean) {
    const formData = new FormData();
    formData.append('product', productId.toString());
    formData.append('image', imageFile);
    if (altText) formData.append('alt_text', altText);
    if (isPrimary) formData.append('is_primary', isPrimary.toString());
    
    const response = await api.post('/vendors/product-images/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }

  async deleteProductImage(imageId: number): Promise<void> {
    await api.delete(`/vendors/product-images/${imageId}/`);
  }

  async setPrimaryImage(imageId: number) {
    const response = await api.post(`/vendors/product-images/${imageId}/set_primary/`);
    return response.data;
  }
}

export class OrdersApiService {
  // Basic order operations
  async getOrders(filters?: OrderFilters): Promise<{ count: number; results: any[] }> {
    const response = await api.get('/orders/orders/', { params: filters });
    return response.data;
  }

  async getOrder(id: number): Promise<any> {
    const response = await api.get(`/orders/orders/${id}/`);
    return response.data;
  }

  async createOrder(data: any): Promise<any> {
    const response = await api.post('/orders/orders/', data);
    return response.data;
  }

  async updateOrder(id: number, data: any): Promise<any> {
    const response = await api.patch(`/orders/orders/${id}/`, data);
    return response.data;
  }

  async cancelOrder(id: number): Promise<any> {
    const response = await api.post(`/orders/orders/${id}/cancel/`);
    return response.data;
  }

  // Customer orders
  async getMyOrders(): Promise<any[]> {
    const response = await api.get('/orders/orders/my_orders/');
    return response.data;
  }

  // Vendor orders management
  async getVendorOrders(filters?: OrderFilters): Promise<{ count: number; results: any[] }> {
    const response = await api.get('/orders/orders/vendor/orders/', { params: filters });
    return response.data;
  }

  async getVendorDashboardOrders(): Promise<any[]> {
    const response = await api.get('/orders/orders/vendor/dashboard/');
    return response.data;
  }

  async getGasProductOrders(filters?: { status?: string }): Promise<any[]> {
    const response = await api.get('/orders/orders/vendor/gas_products/', { params: filters });
    return response.data;
  }

  // Order actions
  async updateOrderStatus(orderId: number, status: string, note?: string): Promise<any> {
    const response = await api.post(`/orders/orders/${orderId}/update_status/`, { status, note });
    return response.data;
  }

  async updateOrderPriority(orderId: number, priority: string): Promise<any> {
    const response = await api.post(`/orders/orders/${orderId}/update_priority/`, { priority });
    return response.data;
  }

  async updateCompletionTime(orderId: number, estimatedCompletionTime: string): Promise<any> {
    const response = await api.post(`/orders/orders/${orderId}/update_completion_time/`, { 
      estimated_completion_time: estimatedCompletionTime 
    });
    return response.data;
  }

  // Bulk operations
  async bulkUpdateStatus(data: BulkOrderStatusUpdate): Promise<any> {
    const response = await api.post('/orders/orders/vendor/bulk_update_status/', data);
    return response.data;
  }

  // Analytics
  async getVendorAnalytics(days?: number): Promise<any> {
    const response = await api.get('/orders/orders/vendor/analytics/', { params: { days } });
    return response.data;
  }

  // Tracking
  async getOrderTracking(orderId: number): Promise<any[]> {
    const response = await api.get(`/orders/orders/${orderId}/tracking/`);
    return response.data;
  }
}

// Create singleton instances
export const vendorsApiService = new VendorsApiService();
export const gasProductsApiService = new GasProductsApiService();
export const ordersApiService = new OrdersApiService();

// Add the missing vendorPayoutsAPI
export const vendorPayoutsAPI = {
  getPayoutPreferences: () => vendorsApiService.getPayoutPreferences(),
  updatePayoutPreferences: (data: any) => vendorsApiService.updatePayoutPreferences(data),
  getPayoutHistory: () => vendorsApiService.getPayoutHistory(),
  createPayoutRequest: (data: any) => paymentApiService.createPayoutRequest(data),
  getPayoutRequests: () => paymentApiService.getPayoutRequests(),
};

// Legacy exports for backward compatibility
export const vendorsAPI = {
  getVendors: (filters?: VendorFilters) => vendorsApiService.getVendors(filters),
  getVendor: (id: number) => vendorsApiService.getVendor(id),
  getMyVendor: () => vendorsApiService.getMyVendor(),
  registerVendor: (data: VendorCreateData) => vendorsApiService.registerVendor(data),
  updateVendor: (id: number, data: VendorUpdateData) => vendorsApiService.updateVendor(id, data),
  getVendorDashboard: () => vendorsApiService.getVendorDashboard(),
  getVendorDashboardAnalytics: () => vendorsApiService.getVendorDashboardAnalytics(),
  getVendorStats: () => vendorsApiService.getVendorStats(),
  getOrderAnalytics: (period?: string) => vendorsApiService.getOrderAnalytics(period),
  updatePerformanceMetrics: () => vendorsApiService.updatePerformanceMetrics(),
  getEarnings: (filters?: any) => vendorsApiService.getEarnings(filters),
  getPayoutHistory: () => vendorsApiService.getPayoutHistory(),
  getPayoutPreferences: () => vendorsApiService.getPayoutPreferences(),
  updatePayoutPreferences: (data: any) => vendorsApiService.updatePayoutPreferences(data),
  getNearbyVendors: (lat: number, lng: number, radius?: number, business_type?: string) => 
    vendorsApiService.getNearbyVendors(lat, lng, radius, business_type),
  getVendorWithProducts: (id: number) => vendorsApiService.getVendorWithProducts(id),
  getVendorReviews: (vendorId: number) => vendorsApiService.getVendorReviews(vendorId),
  createReview: (vendorId: number, data: VendorReviewData) => vendorsApiService.createReview(vendorId, data),
  updateReview: (reviewId: number, data: VendorReviewData) => vendorsApiService.updateReview(reviewId, data),
  deleteReview: (reviewId: number) => vendorsApiService.deleteReview(reviewId),
  getOperatingHours: (vendorId: number) => vendorsApiService.getOperatingHours(vendorId),
  createOperatingHours: (data: OperatingHoursData) => vendorsApiService.createOperatingHours(data),
  updateOperatingHours: (id: number, data: OperatingHoursData) => vendorsApiService.updateOperatingHours(id, data),
  deleteOperatingHours: (id: number) => vendorsApiService.deleteOperatingHours(id),
};

export const gasProductsAPI = {
  getGasProducts: (filters?: GasProductFilters) => gasProductsApiService.getGasProducts(filters),
  getGasProduct: (id: number) => gasProductsApiService.getGasProduct(id),
  createGasProduct: (data: GasProductCreateData) => gasProductsApiService.createGasProduct(data),
  updateGasProduct: (id: number, data: GasProductUpdateData) => gasProductsApiService.updateGasProduct(id, data),
  deleteGasProduct: (id: number) => gasProductsApiService.deleteGasProduct(id),
  getMyProducts: () => gasProductsApiService.getMyProducts(),
  updateStock: (id: number, stockQuantity: number, minStockAlert?: number) => 
    gasProductsApiService.updateStock(id, stockQuantity, minStockAlert),
  toggleAvailability: (id: number) => gasProductsApiService.toggleAvailability(id),
  getFeaturedProducts: () => gasProductsApiService.getFeaturedProducts(),
  searchProducts: (query: string, filters?: GasProductFilters) => 
    gasProductsApiService.searchProducts(query, filters),
  uploadProductImage: (productId: number, imageFile: File, altText?: string, isPrimary?: boolean) => 
    gasProductsApiService.uploadProductImage(productId, imageFile, altText, isPrimary),
  deleteProductImage: (imageId: number) => gasProductsApiService.deleteProductImage(imageId),
  setPrimaryImage: (imageId: number) => gasProductsApiService.setPrimaryImage(imageId),
};

export const ordersAPI = {
  getOrders: (filters?: OrderFilters) => ordersApiService.getOrders(filters),
  getOrder: (id: number) => ordersApiService.getOrder(id),
  createOrder: (data: any) => ordersApiService.createOrder(data),
  updateOrder: (id: number, data: any) => ordersApiService.updateOrder(id, data),
  cancelOrder: (id: number) => ordersApiService.cancelOrder(id),
  getMyOrders: () => ordersApiService.getMyOrders(),
  getVendorOrders: (filters?: OrderFilters) => ordersApiService.getVendorOrders(filters),
  getVendorDashboardOrders: () => ordersApiService.getVendorDashboardOrders(),
  getGasProductOrders: (filters?: { status?: string }) => ordersApiService.getGasProductOrders(filters),
  updateOrderStatus: (orderId: number, status: string, note?: string) => 
    ordersApiService.updateOrderStatus(orderId, status, note),
  updateOrderPriority: (orderId: number, priority: string) => 
    ordersApiService.updateOrderPriority(orderId, priority),
  updateCompletionTime: (orderId: number, estimatedCompletionTime: string) => 
    ordersApiService.updateCompletionTime(orderId, estimatedCompletionTime),
  bulkUpdateStatus: (data: BulkOrderStatusUpdate) => ordersApiService.bulkUpdateStatus(data),
  getVendorAnalytics: (days?: number) => ordersApiService.getVendorAnalytics(days),
  getOrderTracking: (orderId: number) => ordersApiService.getOrderTracking(orderId),
};

// Additional utility exports
export const vendorDashboardAPI = {
  getDashboardOverview: () => vendorsApiService.getVendorDashboard(),
  getDashboardAnalytics: () => vendorsApiService.getVendorDashboardAnalytics(),
  getVendorStats: () => vendorsApiService.getVendorStats(),
  getEarnings: (filters?: any) => vendorsApiService.getEarnings(filters),
  getPayoutHistory: () => vendorsApiService.getPayoutHistory(),
  getOrderAnalytics: (period?: string) => vendorsApiService.getOrderAnalytics(period),
  getVendorOrderAnalytics: (days?: number) => ordersApiService.getVendorAnalytics(days),
  getMyProducts: () => gasProductsApiService.getMyProducts(),
  getVendorOrders: (filters?: OrderFilters) => ordersApiService.getVendorOrders(filters),
  getDashboardOrders: () => ordersApiService.getVendorDashboardOrders(),
  getPayoutPreferences: () => vendorsApiService.getPayoutPreferences(),
  updatePayoutPreferences: (data: any) => vendorsApiService.updatePayoutPreferences(data),
};