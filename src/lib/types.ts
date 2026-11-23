export type Category = {
  id: string;
  slug: string;
  name: string;
  name_en?: string | null;
  image_url: string | null;
  sort_order: number;
};

export type Variant = {
  id: string;
  sku: string;
  size: string | null;
  color_name: string | null;
  color_hex: string | null;
  price_override: number | null;
  image_url?: string | null;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  name_en?: string | null;
  subtitle: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  tag: string | null;
  images: string[];
  rating: number;
  rating_count: number;
  sold_count: number;
  is_featured: boolean;
  is_active: boolean;
};

export type ProductWithVariants = Product & {
  product_variants: (Variant & { available: number })[];
};

export type CartItem = {
  variantId: string;
  productSlug: string;
  name: string;
  label: string;
  unitPrice: number;
  qty: number;
  image: string | null;
  max: number;
};
