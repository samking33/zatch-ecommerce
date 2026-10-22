"use client";

import { useState } from "react";
import { Search, Mail } from "lucide-react";

// The app's help screen FAQ (help_screen.dart). "How do refunds work?" is left out until
// refunds exist on the server (bugs-found.md B-03), so the site doesn't promise one.
const FAQS: [string, string][] = [
  ["What is Zatch?", "Zatch is a live and short-video shopping app where sellers explain products on video and buyers can interact, bargain, and buy in real time."],
  ["How is Zatch different from other shopping apps?", "Zatch replaces static images and text with live demonstrations and short videos, making online shopping feel closer to offline shopping."],
  ["How do I buy a product on Zatch?", "You can buy during a live session or from a short video. Tap Buy or use bargaining if enabled, then complete payment."],
  ["What is “Zatch it”?", "“Zatch it” is Zatch’s simple bargaining flow that lets you negotiate prices directly with sellers in real time."],
  ["Is bargaining compulsory?", "No. Bargaining is optional and only available if the seller enables it."],
  ["Can I ask the seller questions?", "Yes. During live shopping, you can ask questions and get answers instantly."],
  ["Can I shop in my own language?", "Yes. You can watch and listen to sellers in Hindi, Telugu, or English."],
  ["How do payments work?", "All payments happen securely through Razorpay. Once paid, your order is confirmed."],
  ["How do I track my order?", "Go to My Orders to see live updates on packing, shipping, and delivery."],
  ["Can I cancel my order?", "You can request cancellation depending on the order status and seller policy."],
  ["What if my order is delayed or missing?", "Raise a support request from the order page and our team will assist you."],
  ["Is shopping on Zatch safe?", "Yes. Sellers are verified and orders, payments, and tracking are handled within Zatch."],
  ["How do I contact Zatch support?", "Email us at support@zatch.shop, or raise a request from your order or account."],
  ["What issues can support help with?", "Orders, payments, delivery issues, account problems, and disputes."],
];

// The app's seller FAQ (sellersscreens/faq_screen.dart). "How are returns and disputes handled?" is left
// out for the same reason: there are no returns yet, and product pages say all sales are final.
export const SELLER_FAQS: [string, string][] = [
  ["Who can sell on Zatch?", "Any individual seller, creator, or small business can apply, subject to verification."],
  ["How do I become a seller?", "Go to your profile and upgrade to a seller by submitting business and bank details."],
  ["Do I need a website to sell?", "No. Zatch provides everything needed to sell online."],
  ["How does live selling work?", "You go live on camera, explain products, answer buyer questions, and close orders in real time."],
  ["What are short video sales?", "You can upload short product pitch videos that buyers can watch and buy from directly."],
  ["How does bargaining work for sellers?", "You set a minimum price and acceptance rules. Buyers can send offers using “Zatch it”."],
  ["Can I sell in my own language?", "Yes. You can speak naturally in Hindi, Telugu, or English."],
  ["How do I manage orders?", "All orders appear in your seller dashboard where you can pack, ship, and update status."],
  ["How do payouts work?", "Zatch collects payments and sends payouts to your linked bank account based on payout timelines."],
  ["When will I receive my payout?", "Exact payout dates are shown on your Payouts page and depend on order completion."],
  ["Do I get analytics and insights?", "Yes. You can view views, engagement, orders, and conversion data."],
  ["Do I need to run ads to get sales?", "No. Zatch focuses on organic discovery through video, not pay-to-win ads."],
  ["Are there rules on what I can sell?", "Yes. Sellers must follow Zatch’s product and conduct guidelines."],
];

export function Faq({ items = FAQS }: { items?: [string, string][] }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const shown = items.filter(([a, b]) => !term || a.toLowerCase().includes(term) || b.toLowerCase().includes(term));
  return (
    <section className="card mb-4 rounded-[2rem] p-6 sm:p-8">
      <h2 className="font-display text-xl font-semibold text-ink">Frequently asked questions</h2>
      <label className="relative mt-4 flex items-center">
        <Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search help" aria-label="Search help"
          className="h-11 w-full rounded-full border border-hairline bg-surface-2 pl-10 pr-4 text-[15px] text-ink focus:border-ink focus:outline-none" />
      </label>
      <div className="mt-4 divide-y divide-hairline">
        {shown.length === 0 ? (
          <p className="py-3 text-muted">No answers match &ldquo;{q}&rdquo;. Email us below.</p>
        ) : shown.map(([question, answer]) => (
          <details key={question} className="group py-3">
            <summary className="cursor-pointer list-none text-[15px] font-medium text-ink">{question}</summary>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{answer}</p>
          </details>
        ))}
      </div>
      <a href="mailto:support@zatch.shop" className="pill-lime mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold">
        <Mail className="h-4 w-4" /> Still stuck? Email support
      </a>
    </section>
  );
}
