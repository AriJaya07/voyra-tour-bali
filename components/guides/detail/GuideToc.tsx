"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/guides/toc";

interface Props {
  items: TocItem[];
}

/**
 * Sticky table of contents with scroll-spy via IntersectionObserver.
 * Mobile (<lg) renders inside a collapsible <details>; desktop pins
 * to the left rail.
 */
export default function GuideToc({ items }: Props) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (items.length === 0) return;
    const observed: HTMLElement[] = [];
    for (const it of items) {
      const el = document.getElementById(it.id);
      if (el) observed.push(el);
    }
    if (observed.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-90px 0px -65% 0px", threshold: [0, 1] }
    );
    observed.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <>
      {/* Mobile: collapsible */}
      <details className="lg:hidden mb-6 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <summary className="cursor-pointer text-sm font-bold text-gray-900">
          On this page ({items.length})
        </summary>
        <List items={items} activeId={activeId} />
      </details>

      {/* Desktop: sticky rail */}
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">
            On this page
          </p>
          <List items={items} activeId={activeId} />
        </div>
      </aside>
    </>
  );
}

function List({ items, activeId }: { items: TocItem[]; activeId: string }) {
  return (
    <nav>
      <ul className="space-y-1.5 text-sm">
        {items.map((it) => (
          <li key={it.id} className={it.level === 3 ? "pl-3" : ""}>
            <a
              href={`#${it.id}`}
              className={`block py-1 border-l-2 pl-3 transition leading-snug ${
                activeId === it.id
                  ? "border-[#0071CE] text-[#0071CE] font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
