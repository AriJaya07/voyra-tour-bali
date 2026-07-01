"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import GuideMarkdown from "./GuideMarkdown";
import { useTranslateMutation } from "@/utils/hooks/useAiWallet";

const LANGS: { code: string; label: string }[] = [
  { code: "id", label: "🇮🇩 Indonesia" },
  { code: "zh", label: "🇨🇳 中文" },
  { code: "ja", label: "🇯🇵 日本語" },
  { code: "ko", label: "🇰🇷 한국어" },
  { code: "fr", label: "🇫🇷 Français" },
  { code: "de", label: "🇩🇪 Deutsch" },
  { code: "es", label: "🇪🇸 Español" },
];

export default function GuideBodyWithTranslate({ body }: { body: string }) {
  const { status } = useSession();
  const translate = useTranslateMutation();
  const [active, setActive] = useState<string>("original");
  const [cache, setCache] = useState<Record<string, string>>({});

  const selectLang = async (code: string) => {
    if (code === "original") {
      setActive("original");
      return;
    }
    if (cache[code]) {
      setActive(code);
      return;
    }
    if (status !== "authenticated") {
      toast.message("Sign in to translate", {
        description: "Log in to read this guide in your language.",
        action: {
          label: "Sign in",
          onClick: () =>
            (window.location.href = "/login?callbackUrl=" + encodeURIComponent(window.location.pathname)),
        },
      });
      return;
    }
    try {
      const res = await translate.mutateAsync({ text: body, targetLang: code });
      setCache((c) => ({ ...c, [code]: res.translated }));
      setActive(code);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Translation unavailable";
      const lowCredits = /credit/i.test(msg);
      toast.error(msg, {
        description: lowCredits ? "Top up to translate." : undefined,
        action: lowCredits ? { label: "Get credits", onClick: () => (window.location.href = "/ai/pricing") } : undefined,
      });
    }
  };

  const displayBody = active === "original" ? body : cache[active] ?? body;

  return (
    <div>
      {/* Language toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 p-2">
        <span className="mr-1 text-xs font-semibold text-gray-500">🌐 Read in:</span>
        <button
          type="button"
          onClick={() => selectLang("original")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            active === "original" ? "bg-[#0071CE] text-white" : "bg-white text-gray-600 hover:text-[#0071CE] border border-gray-200"
          }`}
        >
          English
        </button>
        {LANGS.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => selectLang(l.code)}
            disabled={translate.isPending}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-60 ${
              active === l.code ? "bg-[#0071CE] text-white" : "bg-white text-gray-600 hover:text-[#0071CE] border border-gray-200"
            }`}
          >
            {l.label}
          </button>
        ))}
        {translate.isPending && <span className="text-xs text-gray-400">Translating…</span>}
      </div>

      {active !== "original" && (
        <p className="mb-4 text-[11px] text-gray-400">
          AI-translated · original English is authoritative. Section links may not jump while translated.
        </p>
      )}

      <GuideMarkdown body={displayBody} />
    </div>
  );
}
