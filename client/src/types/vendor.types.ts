export interface OperatingHours {
  id: number;
  day: number;
  opening_time: string;
  closing_time: string;
  is_closed: boolean;
}

export interface VendorReview {
  id: number;
  customer_name: string;
  customer_username: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface VendorCreateData {
  business_name: string;
  business_type: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address: string;
  city: string;
  country?: string;
  contact_number: string;
  email?: string;
  website?: string;
  delivery_radius_km?: number;
  min_order_amount?: number;
  delivery_fee?: number;
}

export interface VendorUpdateData {
  business_name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  contact_number?: string;
  email?: string;
  website?: string;
  opening_hours?: string;
  delivery_radius_km?: number;
  min_order_amount?: number;
  delivery_fee?: number;
}

export interface VendorReviewData {
  rating: number;
  comment?: string;
}

export interface OperatingHoursData {
  day: number;
  opening_time: string;
  closing_time: string;
  is_closed?: boolean;
}