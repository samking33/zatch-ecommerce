import Image from "next/image";
import { cn } from "@/lib/utils";

/** Profile picture, or the first letter when there isn't one. */
export function Avatar({
  name,
  url,
  size = 36,
  className,
}: {
  name?: string;
  url?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-[13px] font-semibold text-ink",
        className,
      )}
    >
      {url ? (
        <Image src={url} alt="" width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        (name?.[0] ?? "?").toUpperCase()
      )}
    </span>
  );
}
