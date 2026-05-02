"use client";

import { useEffect, useMemo, useState } from "react";
import { AI_HERO_GUEST_PROMPTS } from "@/lib/config/aiCopy";

const TYPE_DELAY_MS = 28;
const HOLD_MS = 1800;
const CLEAR_DELAY_MS = 700;

/**
 * Self-typing "user prompt" demo for the homepage hero. Cycles through
 * AI_HERO_GUEST_PROMPTS, types each char-by-char, holds, then erases.
 *
 * Pure CSS-friendly: no canvas, no streaming. Pauses when tab hidden.
 */
export default function AiPromptDemo() {
  const prompts = useMemo(() => AI_HERO_GUEST_PROMPTS, []);
  const [promptIndex, setPromptIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "clearing">("typing");

  useEffect(() => {
    const target = prompts[promptIndex] ?? "";

    if (typeof document !== "undefined" && document.hidden) {
      // Skip animation while tab is hidden — saves CPU.
      const id = setTimeout(() => setPhase("typing"), 200);
      return () => clearTimeout(id);
    }

    if (phase === "typing") {
      if (text.length < target.length) {
        const id = setTimeout(() => setText(target.slice(0, text.length + 1)), TYPE_DELAY_MS);
        return () => clearTimeout(id);
      }
      const id = setTimeout(() => setPhase("holding"), HOLD_MS);
      return () => clearTimeout(id);
    }
    if (phase === "holding") {
      const id = setTimeout(() => setPhase("clearing"), HOLD_MS);
      return () => clearTimeout(id);
    }
    if (text.length > 0) {
      const id = setTimeout(() => setText(text.slice(0, -1)), TYPE_DELAY_MS / 2);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      setPromptIndex((i) => (i + 1) % prompts.length);
      setPhase("typing");
    }, CLEAR_DELAY_MS);
    return () => clearTimeout(id);
  }, [phase, text, prompts, promptIndex]);

  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur">
      <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">
        You ask
      </div>
      <p
        className="mt-1 min-h-[1.6em] text-base font-medium text-white/95 sm:text-lg"
        aria-live="polite"
      >
        <span>{text}</span>
        <span className="ml-0.5 inline-block h-[1em] w-[2px] animate-pulse bg-white/80 align-middle" />
      </p>
      <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/60">
        AI replies
      </div>
      <p className="mt-1 text-xs text-white/80 leading-relaxed">
        ✓ Built with bookable tours · weather + Nyepi aware · respects party + dietary
      </p>
    </div>
  );
}
