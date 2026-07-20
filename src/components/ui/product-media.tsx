import Image from "next/image";
import { ProductOrb, type OrbTone } from "./product-orb";
import { cn } from "@/lib/utils";

// Real product photo when the backend supplies one; the abstract orb otherwise
// so the layout never breaks. Parent must be positioned + sized (has height).
export function ProductMedia({
  src,
  alt,
  tone = "cobalt",
  sizes = "(max-width: 768px) 50vw, 25vw",
  className,
  float = false,
}: {
  src?: string;
  alt: string;
  tone?: OrbTone;
  sizes?: string;
  className?: string;
  float?: boolean;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }
  return <ProductOrb tone={tone} float={float} className={className} />;
}
