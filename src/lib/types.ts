// Mirrors the shapes returned by zatch-main (Mongoose models). Partial —
// only fields the storefront reads.

export interface ProductImage {
  public_id?: string;
  url: string;
}

export interface Variant {
  color?: string;
  size?: string;
  stock: number;
  isOutOfStock?: boolean;
  price?: number;
  discountedPrice?: number;
  images?: ProductImage[];
}

export interface Product {
  _id: string;
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  images: ProductImage[];
  category: string;
  subCategory?: string;
  brand?: string;
  variants?: Variant[];
  totalStock?: number;
  isTopPick?: boolean;
  likeCount?: number;
  viewCount?: number;
  saveCount?: number;
  bargainSettings?: { autoAcceptDiscount?: number; maximumDiscount?: number };
  analytics?: { averageRating?: number; totalReviews?: number; totalSales?: number };
  sellerId?: string | Seller;
}

export interface Seller {
  _id: string;
  username: string;
  profilePic?: ProductImage;
  sellerProfile?: { businessName?: string };
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  image?: ProductImage;
  subCategories?: { name: string; slug: string }[];
}

export interface LiveSession {
  _id: string;
  channelName: string;
  title: string;
  status: "scheduled" | "live" | "ended";
  viewersCount?: number;
  thumbnail?: ProductImage;
  hostId?: string | Seller;
}

export interface Bit {
  _id: string;
  title?: string;
  description?: string;
  video?: string;
  thumbnail?: ProductImage;
  likeCount?: number;
  viewCount?: number;
}
