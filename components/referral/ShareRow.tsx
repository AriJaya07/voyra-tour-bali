"use client";

import { useState } from "react";
import { toast } from "sonner";

interface ShareRowProps {
  code: string;
  inviterName?: string;
}

const WA_SUPPORT = process.env.NEXT_PUBLIC_WA_NUMBER || "";

function buildLink(code: string) {
  if (typeof window === "undefined") return `/r/${code}`;
  return `${window.location.origin}/r/${code}`;
}

function buildMessage(code: string, link: string, inviterName?: string) {
  const who = inviterName ? `from ${inviterName}` : "";
  return `Heads up — Voyra has solid Bali tours. Sign up with my invite ${who} and you'll start with 50 free AI trip-credits: ${link} (code ${code})`;
}

export default function ShareRow({ code, inviterName }: ShareRowProps) {
  const [busy, setBusy] = useState<string | null>(null);

  const recordShare = async (channel: string) => {
    void fetch("/api/referrals/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel, code }),
      keepalive: true,
    }).catch(() => {});
  };

  const link = typeof window !== "undefined" ? buildLink(code) : `/r/${code}`;
  const msg = buildMessage(code, link, inviterName);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied", { description: link });
      recordShare("copy");
    } catch {
      toast(link, { description: "Long-press to copy", duration: 8000 });
    }
  };

  const openWindow = (url: string, channel: string) => {
    setBusy(channel);
    recordShare(channel);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => setBusy(null), 600);
  };

  const onWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    openWindow(url, "whatsapp");
  };
  const onX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`;
    openWindow(url, "x");
  };
  const onFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    openWindow(url, "facebook");
  };
  const onEmail = () => {
    const subject = "Join me on Voyra — 50 free AI credits";
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`;
    setBusy("email");
    recordShare("email");
    window.location.href = url;
    setTimeout(() => setBusy(null), 600);
  };

  const onNative = async () => {
    if (typeof navigator === "undefined" || !("share" in navigator)) return;
    setBusy("native_share");
    try {
      await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
        title: "You're invited to Voyra",
        text: msg,
        url: link,
      });
      recordShare("native_share");
    } catch {
      // user cancelled — silent
    } finally {
      setBusy(null);
    }
  };

  const supportsNative = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      <ShareBtn
        label="WhatsApp"
        emoji="💬"
        onClick={onWhatsApp}
        busy={busy === "whatsapp"}
        bg="bg-emerald-500 hover:bg-emerald-600"
      />
      <ShareBtn
        label="Email"
        emoji="✉️"
        onClick={onEmail}
        busy={busy === "email"}
        bg="bg-slate-700 hover:bg-slate-800"
      />
      <ShareBtn label="X" emoji="𝕏" onClick={onX} busy={busy === "x"} bg="bg-black hover:bg-gray-900" />
      <ShareBtn
        label="Facebook"
        emoji="ƒ"
        onClick={onFacebook}
        busy={busy === "facebook"}
        bg="bg-blue-600 hover:bg-blue-700"
      />
      {supportsNative ? (
        <ShareBtn
          label="More"
          emoji="↗"
          onClick={onNative}
          busy={busy === "native_share"}
          bg="bg-[#0071CE] hover:bg-[#005ba6]"
        />
      ) : (
        <ShareBtn
          label="Copy"
          emoji="🔗"
          onClick={onCopy}
          busy={false}
          bg="bg-[#0071CE] hover:bg-[#005ba6]"
        />
      )}
      {WA_SUPPORT ? null : null}
    </div>
  );
}

function ShareBtn({
  label,
  emoji,
  onClick,
  busy,
  bg,
}: {
  label: string;
  emoji: string;
  onClick: () => void;
  busy: boolean;
  bg: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`flex items-center justify-center gap-2 px-3 py-2.5 text-white rounded-xl text-xs font-bold transition shadow-sm ${bg} ${busy ? "opacity-60" : ""}`}
    >
      <span aria-hidden>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}
