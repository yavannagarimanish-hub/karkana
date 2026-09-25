export type ProductModule = 'BASIC' | 'CUSTOMIZED' | 'PERSONALIZED';

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Product {
  id: string;
  name: string;
  images: string[];
  description: string;
  price: number;
  original_price?: number;
  module: ProductModule;
  category: string;
  display_position: number;
  is_featured: boolean;
  is_popular: boolean;
  is_visible: boolean;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorefrontSection {
  id: string;
  key: 'popular' | 'featured' | 'basic' | 'customized' | 'personalized';
  title: string;
  subtitle: string;
  is_visible: boolean;
  display_position: number;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  personalizationImage?: string; // Customer uploaded image for PERSONALIZED items
  customizationNotes?: string;   // Customer instructions for PERSONALIZED items
}

export interface OrderCustomerAddress {
  houseFlat: string;
  streetLocality: string;
  city: string;
  state: string;
  pincode: string;
  instructions?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  module: ProductModule;
  productImage?: string;
  personalizationImage?: string; // Specific customer upload for this order item
  customizationNotes?: string;
}

export interface Order {
  id: string;
  customerName: string;
  mobile: string;
  address: OrderCustomerAddress;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: 'Cash on Delivery';
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMetrics {
  totalProducts: number;
  basicProducts: number;
  customizedProducts: number;
  personalizedProducts: number;
  visibleProducts: number;
  totalOrders: number;
  newOrders: number;
  preparingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
}
