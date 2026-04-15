"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IoChatbubblesOutline, IoClose, IoSend } from "react-icons/io5";
import { HiSparkles } from "react-icons/hi2";
import Image from "next/image";
import Link from "next/link";

interface ProductCard {
  productCode: string;
  title: string;
  imageUrl: string;
  price: number | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: ProductCard[];
}

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! I'm your Bali travel assistant ✈️ Tell me what you'd like to do — adventure, culture, beaches — and I'll show you the best tours!",
};

const STORAGE_KEY = "blt-chat-seen";

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(true); // default true prevents flash on SSR
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function sendMessage() {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    const history = messages.filter((m) => m !== WELCOME_MESSAGE);

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
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    // Safe area padding for iOS home indicator; right-3/bottom-4 on mobile, right-6/bottom-6 on sm+
    <div
      className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3"
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
              width: "min(390px, calc(100vw - 24px))",
              maxHeight: "min(580px, calc(100dvh - 100px))",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 flex-shrink-0">
              <div className="flex items-center gap-2">
                <HiSparkles className="text-white text-lg" />
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">
                    Bali Travel AI
                  </p>
                  <p className="text-blue-100 text-xs">balitravelnow.com</p>
                </div>
              </div>
              <button
                onClick={handleToggle}
                className="text-white hover:text-blue-100 transition-colors p-1"
                aria-label="Close chat"
              >
                <IoClose size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50 overscroll-contain">
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

                  {/* Product cards — 2 cols on all sizes */}
                  {msg.products && msg.products.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="grid grid-cols-2 gap-2"
                    >
                      {msg.products.map((card) => (
                        <Link
                          key={card.productCode}
                          href={`/viator/${card.productCode}`}
                          className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-blue-200 active:scale-95 transition-all duration-200 group"
                          onClick={() => setIsOpen(false)}
                        >
                          <div className="relative h-20 sm:h-24 bg-gray-100">
                            {card.imageUrl ? (
                              <Image
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
                                From ${card.price}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2.5 border-t border-gray-100 bg-white flex items-center gap-2 flex-shrink-0">
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
                onClick={sendMessage}
                disabled={isStreaming || !inputValue.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Send"
              >
                <IoSend size={15} />
              </button>
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
    </div>
  );
}
