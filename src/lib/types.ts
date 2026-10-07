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
  category_id: string | null;
  created_at: string;
  sold_count: number;
};

export type ProductWithVariants = Product & {
  product_variants: (Variant & { available: number })[];
};

export type CartLine = {
  variantId: string;
  productSlug: string;
  name: string;
  name_en?: string | null;
  label: string;
  unitPrice: number;
  qty: number;
  image?: string | null;
};
