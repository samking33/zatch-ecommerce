"use client";

import { useEffect, useRef, useState } from "react";
import { Users, Heart, Send } from "lucide-react";
import { ProductOrb } from "@/components/ui/product-orb";
import { BargainBox } from "@/components/product/bargain-box";
import { compact } from "@/lib/utils";

type Msg = { id: number; user: string; text: string; offer?: boolean };

const seed: Msg[] = [
  { id: 1, user: "meera", text: "is this available in black?" },
  { id: 2, user: "arjun", text: "offered ₹5,500", offer: true },
  { id: 3, user: "host", text: "black is live now 🔥" },
  { id: 4, user: "sana", text: "take my ₹6,000 please" },
];
const incoming = [
  "this looks amazing",
  "offered ₹5,800",
  "shipping to Pune?",
  "sold! adding to cart",
  "can you demo the bass?",
];

export function LiveRoom({
  title,
  productId,
  listPrice = 8990,
}: {
  title: string;
  productId?: string;
  listPrice?: number;
}) {
  const [msgs, setMsgs] = useState<Msg[]>(seed);
  const [text, setText] = useState("");
  const [likes, setLikes] = useState(2410);
  const feed = useRef<HTMLDivElement>(null);
  const n = useRef(100);

  useEffect(() => {
    const t = setInterval(() => {
      const body = incoming[n.current % incoming.length];
      setMsgs((m) =>
        [...m, { id: ++n.current, user: `user${n.current % 90}`, text: body, offer: body.includes("offered") }].slice(-30),
      );
      setLikes((l) => l + Math.floor(Math.random() * 5));
    }, 2600);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setMsgs((m) => [...m, { id: ++n.current, user: "you", text }].slice(-30));
    setText("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
      {/* stage */}
      <div className="card relative overflow-hidden rounded-[2rem] p-3">
        <div className="relative aspect-video overflow-hidden rounded-[1.5rem] bg-surface-2">
          <ProductOrb tone="coral" float className="h-full w-full" />
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-live px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide text-white">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" /> Live
          </span>
          <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-ink/80 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur">
            <Users className="h-3.5 w-3.5" /> {compact(1834)}
          </span>
          <button
            onClick={() => setLikes((l) => l + 1)}
            className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-2 text-[13px] font-semibold text-ink backdrop-blur transition hover:bg-white"
          >
            <Heart className="h-4 w-4 fill-live text-live" /> {compact(likes)}
          </button>
        </div>
        <div className="px-3 py-4">
          <h1 className="font-display text-xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-muted">Hosted by @studio.audio · Bargains open</p>
        </div>
      </div>

      {/* chat + bargain */}
      <div className="flex flex-col gap-4">
        <BargainBox productId={productId ?? ""} listPrice={listPrice} autoAcceptDiscount={18} maxDiscount={32} />

        <div className="card flex min-h-[20rem] flex-1 flex-col rounded-[1.75rem] p-4">
          <p className="px-1 text-[13px] font-semibold uppercase tracking-widest text-muted">
            Live chat
          </p>
          <div ref={feed} className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-1">
            {msgs.map((m) => (
              <div key={m.id} className="text-[14px] leading-snug">
                <span className={`font-semibold ${m.user === "you" ? "text-lime-deep" : "text-ink"}`}>
                  {m.user}
                </span>{" "}
                {m.offer ? (
                  <span className="rounded-full bg-lime px-2 py-0.5 text-[12px] font-semibold text-lime-ink">
                    {m.text}
                  </span>
                ) : (
                  <span className="text-ink-soft">{m.text}</span>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={send} className="mt-3 flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Say something or make an offer…"
              className="h-11 flex-1 rounded-full border border-hairline bg-surface-2 px-4 text-[14px] text-ink placeholder:text-muted focus:border-ink focus:outline-none"
            />
            <button type="submit" aria-label="Send" className="btn-ink grid h-11 w-11 shrink-0 place-items-center rounded-full">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
