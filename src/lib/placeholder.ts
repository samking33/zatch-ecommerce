import type { Product, Category, LiveSession, Bit } from "./types";

// Tasteful sample content so the storefront is fully populated before the
// backend is wired up. Real data from the API replaces this at request time.

export const sampleCategories: Category[] = [
  { _id: "c1", name: "Audio", slug: "audio" },
  { _id: "c2", name: "Wearables", slug: "wearables" },
  { _id: "c3", name: "Home", slug: "home" },
  { _id: "c4", name: "Beauty", slug: "beauty" },
  { _id: "c5", name: "Fashion", slug: "fashion" },
];

export const sampleProducts: Product[] = [
  {
    _id: "p1",
    name: "Aurora Over-Ear Headphone",
    price: 8990,
    discountedPrice: 6490,
    category: "Audio",
    brand: "Sequoia",
    images: [],
    isTopPick: true,
    likeCount: 1240,
    analytics: { averageRating: 4.7, totalReviews: 318 },
  },
  {
    _id: "p2",
    name: "X-Bud Pro Wireless",
    price: 4990,
    discountedPrice: 3299,
    category: "Audio",
    brand: "Nova",
    images: [],
    likeCount: 860,
    analytics: { averageRating: 4.6, totalReviews: 190 },
  },
  {
    _id: "p3",
    name: "Halo Smart Ring",
    price: 12990,
    discountedPrice: 9990,
    category: "Wearables",
    brand: "Orbit",
    images: [],
    likeCount: 540,
    analytics: { averageRating: 4.8, totalReviews: 76 },
  },
  {
    _id: "p4",
    name: "Mist Ceramic Diffuser",
    price: 2490,
    discountedPrice: 1690,
    category: "Home",
    brand: "Clay & Co",
    images: [],
    likeCount: 320,
    analytics: { averageRating: 4.5, totalReviews: 128 },
  },
];

export const sampleLive: LiveSession[] = [
  { _id: "l1", channelName: "drops-audio", title: "Audio Drop — flash bargains", status: "live", viewersCount: 1834 },
  { _id: "l2", channelName: "beauty-hour", title: "Beauty Hour with Meera", status: "live", viewersCount: 921 },
];

export const sampleBits: Bit[] = [
  { _id: "b1", title: "Unboxing the Aurora", likeCount: 4200, viewCount: 51000 },
  { _id: "b2", title: "3 ways to style", likeCount: 2100, viewCount: 33000 },
];
