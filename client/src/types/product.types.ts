export interface GasProductCardProps {
  product: GasProductCardProduct;
  onOrderNow?: (product: GasProductCardProduct, includeCylinder: boolean) => void;
  available: boolean;
}

export interface GasProductCardProduct {
  id: number;
  name: string;
  weight: string;
  description: string;
  priceWithCylinder: number;
  priceWithoutCylinder: number;
  vendor_name?: string;
  vendor_city?: string;
  is_available?: boolean;
  in_stock?: boolean;
  stock_quantity?: number;
}

export interface GasProductCreateData {
  name: string;
  gas_type: string;
  cylinder_size: string;
  brand?: string;
  price_with_cylinder: number;
  price_without_cylinder: number;
  stock_quantity: number;
  min_stock_alert?: number;
  description?: string;
  ingredients?: string;
  safety_instructions?: string;
  featured?: boolean;
}

export interface GasProductUpdateData {
  name?: string;
  brand?: string;
  price_with_cylinder?: number;
  price_without_cylinder?: number;
  stock_quantity?: number;
  min_stock_alert?: number;
  description?: string;
  ingredients?: string;
  safety_instructions?: string;
  is_active?: boolean;
  featured?: boolean;
}