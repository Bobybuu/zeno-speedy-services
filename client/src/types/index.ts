// Base types used across the application
export * from './base.types';
export * from './api.types';
export * from './cart.types';
export * from './user.types';
export * from './vendor.types';
export * from './product.types';
export * from './order.types';
export * from './payment.types';

// Common utility types
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location {
  address: string;
  city: string;
  country: string;
  coordinates?: Coordinates;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
}

export interface ServiceCardProps {
  title: string;
  description: string;
  icon: string;
  color: string;
  onClick?: () => void;
}

export interface MapProvider {
  id: number;
  name: string;
  location: string;
  coords: [number, number];
  price: string;
  rating?: number;
  distance?: string;
}

export interface MapProps {
  providers?: MapProvider[];
  center?: [number, number];
  userLocation?: [number, number] | null;
  zoom?: number;
}

export interface MapboxConfig {
  accessToken: string;
  styleUrl: string;
}