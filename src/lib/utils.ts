import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function inr(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function compact(n: number): string {
  return new Intl.NumberFormat("en-IN", { notation: "compact" }).format(n);
}

// Colour and size for display. Products made in the app store "none"/"NONE" when they have neither.
export function variantText(sep: string, ...parts: (string | null | undefined)[]): string {
  return parts.filter((v): v is string => !!v && v.toLowerCase() !== "none").join(sep);
}
