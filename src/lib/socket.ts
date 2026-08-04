"use client";

import { io, type Socket } from "socket.io-client";
import { getToken } from "./client-auth";

const URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

// Every event the backend emits (config/ioConfig.js + controllers).
export type ServerEvents = {
  // bargain - buyer_<id> room
  bargain_accepted: { bargainId: string; productName?: string; productImage?: string; finalPrice?: number };
  bargain_countered: {
    bargainId: string; productName?: string; productImage?: string;
    originalPrice?: number; yourOffer?: number; counterPrice: number; message?: string; expiresAt?: string;
  };
  bargain_rejected: { bargainId: string; productName?: string; reason?: string };
  seller_typing: { bargainId: string };
  // bargain - seller_<id> room
  new_bargain: { bargainId: string; productName?: string; offeredPrice?: number; buyerName?: string };
  buyer_countered: { bargainId: string; counterPrice?: number; productName?: string };
  counter_accepted: { bargainId: string; finalPrice?: number; productName?: string };
  counter_rejected: { bargainId: string; productName?: string };
  buyer_typing: { bargainId: string };
  // bargain_<id> room
  price_updated: { bargainId: string; price: number };
  user_viewing: { bargainId: string; count?: number };
  // live session room
  newComment: { sessionId?: string; comment?: unknown; text?: string; username?: string; user?: unknown };
  likeUpdated: { sessionId?: string; likeCount?: number };
  viewersUpdated: { sessionId?: string; viewersCount?: number; count?: number };
  sessionEnded: { sessionId?: string };
  // broadcast
  sessionWentLive: { sessionId?: string; title?: string };
  newLiveStarted: { sessionId?: string; title?: string };
  // per-user
  new_notification: { title?: string; message?: string; body?: string; type?: string };
};

let socket: Socket | null = null;

/** One shared connection. Auth via the same JWT the REST calls use - the
 *  server puts you in user_/buyer_/seller_ rooms automatically. */
export function getSocket(): Socket {
  if (socket?.connected || socket?.active) return socket;
  socket = io(URL, {
    auth: { token: getToken() },
    transports: ["websocket", "polling"],
    reconnection: true,
  });
  return socket;
}

/** Subscribe to a server event; returns an unsubscribe fn for useEffect. */
export function onEvent<K extends keyof ServerEvents>(
  event: K,
  handler: (payload: ServerEvents[K]) => void,
): () => void {
  const s = getSocket();
  s.on(event as string, handler as (...args: unknown[]) => void);
  return () => { s.off(event as string, handler as (...args: unknown[]) => void); };
}

/** Join/leave the rooms the server exposes. */
export const rooms = {
  joinSession: (id: string) => getSocket().emit("joinSession", id),
  leaveSession: (id: string) => getSocket().emit("leaveSession", id),
  joinBargain: (id: string) => getSocket().emit("join_bargain", id),
  leaveBargain: (id: string) => getSocket().emit("leave_bargain", id),
};

/** Typing indicators, matching the server's listeners. */
export const typing = {
  buyer: (p: { bargainId: string; sellerId?: string; productName?: string }) =>
    getSocket().emit("bargain_typing", p),
  seller: (p: { bargainId: string; buyerId?: string }) => getSocket().emit("seller_typing", p),
};
