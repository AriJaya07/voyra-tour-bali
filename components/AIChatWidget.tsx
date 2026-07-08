"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IoChatbubblesOutline, IoClose, IoSend, IoRefresh, IoLogoWhatsapp } from "react-icons/io5";
import { HiSparkles } from "react-icons/hi2";
import { useSession } from "next-auth/react";
import OptimizedImage from "@/components/common/OptimizedImage";
import { buildViatorProductUrl } from "@/lib/config/viator";
import AiUpgradeModal from "@/components/ai/AiUpgradeModal";
import { useQueryClient } from "@tanstack/react-query";
import { AI_QUERY_KEYS } from "@/utils/hooks/useAiWallet";
import PriceLabel from "@/components/common/PriceLabel";

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";

interface ProductCard {
  productCode: string;
  title: string;
  imageUrl: string;
  price: number | null;
}

interface SourceChip {
  n: number;
  title: string;
  href: string;
  type: string;
}

interface DraftCartItem {
  title: string;
  priceIdr: number;
  source: string;
  slug: string;
  href: string;
}

interface DraftCart {
  items: DraftCartItem[];
  totalIdr: number;
  note: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: ProductCard[];
  sources?: SourceChip[];
  draft?: DraftCart | null;
}

const QUICK_PROMPTS = [
  { label: "🌅 Sunrise tours", text: "What are the best sunrise tours in Bali?" },
  { label: "🌊 Beaches & surf", text: "Recommend beach and surf experiences in Bali" },
  { label: "🛕 Culture & temples", text: "Best cultural and temple tours in Bali" },
  { label: "👨‍👩‍👧 Family-friendly", text: "Tours suitable for families with kids" },
  { label: "💰 Under $50", text: "Affordable tours under $50 per person" },
  { label: "📅 5-day plan", text: "Plan a 5-day Bali itinerary for me" },
];

const STORAGE_KEY = "blt-chat-seen";

export default function AIChatWidget() {
  const { data: session } = useSession();
  const firstName = useMemo(() => {
    const name = session?.user?.name?.trim();
    if (!name) return null;
    return name.split(/\s+/)[0];
  }, [session?.user?.name]);

  const welcomeMessage = useMemo<Message>(
    () => ({
      role: "assistant",
      content: firstName
        ? `Welcome back, ${firstName}! 🌺 Ready to plan your next Bali adventure? Try a starter or ask anything.`
        : "Hi! I'm your Bali travel assistant ✈️ Tell me what you'd like to do — adventure, culture, beaches — or pick a quick start below.",
    }),
    [firstName]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(true);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [upgradeModal, setUpgradeModal] = useState<{
    open: boolean;
    variant: "user_quota" | "guest_quota";
    balance: number;
    reason?: string;
  }>({ open: false, variant: "user_quota", balance: 0 });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const isAuthed = !!session?.user?.id;

  // Refresh welcome when session resolves (avoid stale "Hi!" for signed-in user)
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) return [welcomeMessage];
      // Only swap the first welcome if it's still the only message
      if (prev.length === 1 && prev[0].role === "assistant") return [welcomeMessage];
      return prev;
    });
  }, [welcomeMessage]);

  // After mount, read localStorage to decide whether to show pulse
  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    setHasOpened(!!seen);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  function handleToggle() {
    if (!hasOpened) {
      setHasOpened(true);
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setIsOpen((v) => !v);
  }

  function resetChat() {
    if (isStreaming) return;
    setMessages([welcomeMessage]);
    setInputValue("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function sendMessage(overrideText?: string) {
    const text = (overrideText ?? inputValue).trim();
    if (!text || isStreaming) return;

    const history = messages.filter((m) => m !== welcomeMessage);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "", products: [] },
    ]);
    setInputValue("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: text,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.status === 402) {
        const payload = await res.json().catch(() => ({}));
        const variant = isAuthed ? "user_quota" : "guest_quota";
        setUpgradeModal({
          open: true,
          variant,
          balance: typeof payload?.balance === "number" ? payload.balance : 0,
          reason: payload?.reason,
        });
        // Drop the in-flight assistant placeholder, restore last user msg
        setMessages((prev) => {
          const trimmed = [...prev];
          // Remove trailing empty assistant placeholder
          if (trimmed.length > 0 && trimmed[trimmed.length - 1].role === "assistant" && !trimmed[trimmed.length - 1].content) {
            trimmed.pop();
          }
          trimmed.push({
            role: "assistant",
            content: variant === "guest_quota"
              ? "Looks like you've hit the free guest limit. Sign up to keep chatting."
              : "You're out of AI credits — top up or upgrade to continue.",
          });
          return trimmed;
        });
        return;
      }

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let productsExtracted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse product cards from first line if present
        if (!productsExtracted && buffer.includes("\n")) {
          const newlineIdx = buffer.indexOf("\n");
          const firstLine = buffer.slice(0, newlineIdx);
          const rest = buffer.slice(newlineIdx + 1);

          if (firstLine.startsWith("__PRODUCTS__:")) {
            try {
              const cards: ProductCard[] = JSON.parse(
                firstLine.slice("__PRODUCTS__:".length)
              );
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  products: cards,
                };
                return updated;
              });
            } catch {
              // non-fatal — treat as regular text
            }
            buffer = rest;
          }
          productsExtracted = true;
        }

        // Flush buffered text to UI
        if (productsExtracted && buffer.length > 0) {
          const chunk = buffer;
          buffer = "";
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: updated[updated.length - 1].content + chunk,
            };
            return updated;
          });
        }
      }

      // Flush remainder
      if (buffer.length > 0) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: updated[updated.length - 1].content + buffer,
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: "Sorry, something went wrong. Please try again.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      if (isAuthed) qc.invalidateQueries({ queryKey: AI_QUERY_KEYS.wallet });
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    // Mobile: lifted above the 56px MobileBottomNav (lg:hidden) so the chat
    // button never covers primary nav. Desktop: pinned bottom-right as before.
    <div
      className="fixed right-3 bottom-[72px] sm:right-6 lg:bottom-6 z-50 flex flex-col items-end gap-3"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            // Width: full viewport minus 24px (right-3 = 12px × 2 sides) on mobile,
            // capped at 390px on larger screens
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
            style={{
              width: "min(390px, calc(100dvw - 24px))",
              // 156px = bottom-[72px] anchor + 56px button (h-14) + 12px gap-3 + 16px top breathing room.
              // env(safe-area-inset-bottom) covers iPhone home indicator. 100dvh tracks Safari URL bar.
              maxHeight:
                "min(580px, calc(100dvh - 156px - env(safe-area-inset-bottom, 0px)))",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <HiSparkles className="text-white text-lg flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight truncate">
                    {firstName ? `Hi ${firstName}` : "Bali Travel AI"}
                  </p>
                  <p className="text-blue-100 text-xs truncate">Voyra Bali Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Human escape hatch — WhatsApp beats any bot for trust */}
                <a
                  href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hello! I'm planning a Bali trip and have a question.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Chat with a human on WhatsApp"
                  aria-label="Ask us on WhatsApp"
                  className="p-1 rounded-full text-white hover:bg-white/20 transition"
                >
                  <IoLogoWhatsapp size={17} />
                </a>
                <button
                  onClick={resetChat}
                  disabled={isStreaming || messages.length <= 1}
                  className="text-white hover:text-blue-100 transition-colors p-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Reset chat"
                  title="New chat"
                >
                  <IoRefresh size={18} />
                </button>
                <button
                  onClick={handleToggle}
                  className="text-white hover:text-blue-100 transition-colors p-1"
                  aria-label="Close chat"
                >
                  <IoClose size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50 overscroll-contain">
              {/* Quick prompt chips — only show when chat is fresh */}
              {messages.length === 1 && !isStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                  className="flex flex-wrap gap-2 pt-1"
                >
                  {QUICK_PROMPTS.map((qp) => (
                    <button
                      key={qp.label}
                      onClick={() => sendMessage(qp.text)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-95 transition shadow-sm"
                    >
                      {qp.label}
                    </button>
                  ))}
                </motion.div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className="space-y-2">
                  <div
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm"
                      }`}
                    >
                      {msg.content ||
                        (isStreaming && i === messages.length - 1 ? (
                          <span className="inline-flex gap-1 items-center py-0.5">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                          </span>
                        ) : null)}
                    </div>
                  </div>

                  {/* Citation chips — grounded Voyra sources the concierge cited */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {msg.sources.map((s) => (
                        <a
                          key={s.n}
                          href={s.href}
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 hover:bg-blue-100 transition"
                          title={`Source: ${s.title}`}
                        >
                          <span className="font-bold">[{s.n}]</span>
                          <span className="max-w-[120px] truncate">{s.title}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Draft cart — booking agent assembled a priced plan (no charge) */}
                  {msg.draft && msg.draft.items.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5">
                        <span aria-hidden>🧭</span>
                        <p className="text-xs font-bold text-amber-800">Your draft plan</p>
                      </div>
                      <ul className="divide-y divide-gray-100">
                        {msg.draft.items.map((it) => (
                          <li key={it.slug} className="px-3 py-2 flex items-center justify-between gap-2">
                            <a
                              href={it.href}
                              onClick={() => setIsOpen(false)}
                              className="text-xs font-medium text-gray-800 hover:text-amber-700 line-clamp-2 flex-1"
                            >
                              {it.title}
                            </a>
                            {it.priceIdr > 0 && (
                              <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">
                                <PriceLabel amount={it.priceIdr} sourceCurrency="IDR" prefix="From " />
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">Est. total</span>
                        <span className="text-sm font-black text-gray-900">
                          <PriceLabel amount={msg.draft.totalIdr} sourceCurrency="IDR" />
                        </span>
                      </div>
                      <p className="px-3 py-2 text-[10px] text-gray-500 leading-snug border-t border-gray-100">
                        {msg.draft.note} You review dates &amp; travellers and pay yourself — the AI never charges you.
                      </p>
                    </motion.div>
                  )}

                  {/* Product cards — 2 cols on all sizes */}
                  {msg.products && msg.products.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="grid grid-cols-2 gap-2"
                    >
                      {msg.products.map((card) => (
                        <a
                          key={card.productCode}
                          href={buildViatorProductUrl(card.productCode, card.title)}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-blue-200 active:scale-95 transition-all duration-200 group"
                          onClick={() => setIsOpen(false)}
                        >
                          <div className="relative h-20 sm:h-24 bg-gray-100">
                            {card.imageUrl ? (
                              <OptimizedImage
                                src={card.imageUrl}
                                alt={card.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 640px) 150px, 180px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">
                                🌴
                              </div>
                            )}
                          </div>
                          <div className="p-1.5 sm:p-2">
                            <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">
                              {card.title}
                            </p>
                            {card.price !== null && (
                              <p className="text-xs text-blue-600 font-semibold mt-0.5">
                                <PriceLabel
                                  amount={card.price}
                                  sourceCurrency="USD"
                                  prefix="From "
                                />
                              </p>
                            )}
                          </div>
                        </a>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 bg-white flex-shrink-0">
              <div className="px-3 py-2.5 flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about Bali tours..."
                  disabled={isStreaming}
                  className="flex-1 min-w-0 text-sm px-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400 bg-gray-50 disabled:opacity-60"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={isStreaming || !inputValue.trim()}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  aria-label="Send"
                >
                  <IoSend size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleToggle}
        className="w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center relative"
        aria-label="Open AI chat"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <IoClose size={24} />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <IoChatbubblesOutline size={24} />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulse ring — only on very first visit, disappears after first open */}
        <AnimatePresence>
          {!isOpen && !hasOpened && (
            <motion.span
              key="pulse"
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0, scale: 1.5, transition: { duration: 0.3 } }}
              className="absolute inset-0 rounded-full bg-blue-400 animate-ping"
            />
          )}
        </AnimatePresence>
      </motion.button>

      <AiUpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal((s) => ({ ...s, open: false }))}
        variant={upgradeModal.variant}
        balance={upgradeModal.balance}
        reason={upgradeModal.reason}
      />
    </div>
  );
}
