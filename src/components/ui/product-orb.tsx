import { cn } from "@/lib/utils";

// Self-contained premium "product render": layered gradient orb + soft floor
// shadow + orbiting speck. Used wherever a real product photo isn't loaded,
// so the storefront looks intentional offline instead of showing broken images.
const palettes = {
  cobalt: ["#7aa2ff", "#2743c9", "#0b1550"],
  lime: ["#e6ff8a", "#b4e81f", "#5c7a00"],
  coral: ["#ffb4a8", "#ff5a45", "#7a1e12"],
  violet: ["#d8b4ff", "#8b46e0", "#3a1470"],
  slate: ["#dfe4ec", "#9aa6bd", "#4a5266"],
} as const;

export type OrbTone = keyof typeof palettes;

export function ProductOrb({
  tone = "cobalt",
  className,
  float = false,
}: {
  tone?: OrbTone;
  className?: string;
  float?: boolean;
}) {
  const [hi, mid, lo] = palettes[tone];
  return (
    <div className={cn("relative grid place-items-center", className)}>
      {/* floor shadow */}
      <div className="absolute bottom-[8%] h-[10%] w-[58%] rounded-[50%] bg-ink/25 blur-2xl" />
      <div
        className={cn("relative aspect-square w-[78%]", float && "animate-[float-y_6s_ease-in-out_infinite]")}
        style={{ willChange: "transform" }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 32% 28%, ${hi} 0%, ${mid} 45%, ${lo} 100%)`,
            boxShadow: `inset -18px -22px 60px rgba(0,0,0,0.45), inset 14px 16px 40px rgba(255,255,255,0.35)`,
          }}
        />
        {/* specular highlight */}
        <div className="absolute left-[24%] top-[18%] h-[22%] w-[22%] rounded-full bg-white/70 blur-md" />
        {/* orbiting speck */}
        <div className="absolute -right-[6%] top-[42%] h-3 w-3 rounded-full bg-ink/80" />
        <div className="absolute left-[10%] -top-[3%] h-2 w-2 rounded-full bg-white/90" />
      </div>
    </div>
  );
}
