// Mirrors the shapes returned by zatch-main (Mongoose models). Partial -
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
  // Backend also returns these at the top level.
  averageRating?: number;
  commentCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  comments?: ProductComment[];
  reviews?: ProductReview[];
  sellerId?: string | Seller;
  SKU?: string;
  isSold?: boolean;
  status?: string;
  orderAcceptingType?: string;
  shipping?: { estimatedDeliveryDays?: number; codAvailable?: boolean; returnPolicy?: string };
}

export interface ProductComment {
  _id: string;
  text: string;
  createdAt?: string;
  user?: { _id: string; username?: string; profilePic?: { url?: string } };
}

export interface ProductReview {
  _id: string;
  rating?: number;
  comment?: string;
  createdAt?: string;
  user?: { _id: string; username?: string; profilePic?: { url?: string } };
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
  productId?: string | { _id?: string; name?: string; price?: number };
}

export interface BitComment {
  _id: string;
  text: string;
  createdAt?: string;
  likes?: number;
  user?: { _id: string; username?: string; profilePic?: { url?: string } };
}

export interface BitProduct {
  _id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  image?: ProductImage;
  category?: string;
}

export interface Bit {
  _id: string;
  title?: string;
  description?: string;
  video?: string | ProductImage;
  thumbnail?: ProductImage;
  likeCount?: number;
  viewCount?: number;
  commentCount?: number;
  shareCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  shareLink?: string;
  createdAt?: string;
  comments?: BitComment[];
  products?: BitProduct[];
  uploadedBy?: { _id: string; username?: string; profilePic?: { url?: string }; rating?: number };
}
