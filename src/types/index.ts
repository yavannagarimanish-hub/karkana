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
  brand?: string;
  subcategory?: string;
  short_description?: string;
  raw_mrp?: string;
  raw_selling_price?: string;
  discount_percent?: string | number;
  stock_quantity?: number | null;
  unit?: string;
  safety_instructions?: string;
  notes?: string;
  search_keywords?: string;
  image_width?: number;
  image_height?: number;
  aspect_ratio?: number;
  orientation?: 'WIDE' | 'TALL' | 'SQUARE';
  created_at: string;
  updated_at: string;
}

export type ValidationSeverity = 'ERROR' | 'WARNING' | 'INCOMPLETE';

export interface ValidationIssue {
  id: string;
  productName: string;
  field: string;
  issue: string;
  severity: ValidationSeverity;
  details?: string;
}

export interface CatalogueValidationReport {
  totalProducts: number;
  duplicateIds: { id: string; count: number }[];
  missingIds: { row: number; name?: string }[];
  missingNames: { id: string }[];
  invalidPrices: { id: string; name: string; mrp?: number | null; price?: number | null; issue: string }[];
  incorrectDiscounts: { id: string; name: string; mrp: number; price: number; listedDiscount: string; calculatedDiscount: string; diff: number }[];
  missingImages: { id: string; name: string; image?: string; issue: string }[];
  missingDescriptions: { id: string; name: string }[];
  missingCategories: { id: string; name: string }[];
  missingBrands: { id: string; name: string }[];
  missingStockValues: { id: string; name: string }[];
  otherSchemaViolations: { id: string; name: string; field: string; issue: string }[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  incompleteOptional: ValidationIssue[];
  productsRequiringAttentionCount: number;
  productsRequiringAttentionIds: string[];
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
