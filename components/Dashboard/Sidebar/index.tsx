"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/dashboard",
    exact: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Categories",
    href: "/dashboard/categories",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    color: "emerald",
  },
  {
    label: "Destinations",
    href: "/dashboard/destinations",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: "blue",
  },
  {
    label: "Packages",
    href: "/dashboard/groups",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    color: "violet",
  },
  {
    label: "Images",
    href: "/dashboard/images",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: "rose",
  },
];

const BOTTOM_ITEMS = [
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const ACCENT: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  violet: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  rose: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

const ACTIVE_DOT: Record<string, string> = {
  emerald: "bg-emerald-400",
  blue: "bg-blue-400",
  violet: "bg-violet-400",
  rose: "bg-rose-400",
};

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* ── Mobile top bar ───────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <span className="text-white font-bold text-sm">TravelAdmin</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* ── Mobile overlay ───────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ────────────────────────────────── */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full z-50 w-72 bg-slate-900 border-r border-slate-700/60 flex flex-col transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent
          pathname={pathname}
          isActive={isActive}
          collapsed={false}
          onClose={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 bg-slate-900 border-r border-slate-700/60 transition-all duration-300 ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <SidebarContent
          pathname={pathname}
          isActive={isActive}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((p) => !p)}
        />
      </aside>

      {/* ── Mobile top bar spacer ────────────────────────── */}
      <div className="lg:hidden h-[52px]" />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sidebar content
// ─────────────────────────────────────────────────────────────────────────────
function SidebarContent({
  pathname,
  isActive,
  collapsed,
  onClose,
  onToggleCollapse,
}: {
  pathname: string;
  isActive: (href: string, exact?: boolean) => boolean;
  collapsed: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center justify-between px-4 py-5 border-b border-slate-700/60 ${collapsed ? "px-3 justify-center" : ""}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-900/40">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-none">TravelAdmin</p>
              <p className="text-slate-500 text-xs mt-0.5">Dashboard</p>
            </div>
          )}
        </div>

        {/* Close (mobile) / Collapse (desktop) */}
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/60 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {onToggleCollapse && !collapsed && (
          <button onClick={onToggleCollapse} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/60 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
        {onToggleCollapse && collapsed && (
          <button onClick={onToggleCollapse} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/60 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav label */}
      {!collapsed && (
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-4 pt-5 pb-2">
          Menu
        </p>
      )}

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1 pt-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          const accent = item.color ? ACCENT[item.color] : "";
          const dot = item.color ? ACTIVE_DOT[item.color] : "bg-slate-400";

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 group relative
                ${active
                  ? item.color
                    ? `${accent} border`
                    : "bg-white/10 text-white border border-white/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                }
                ${collapsed ? "justify-center" : ""}
              `}
            >
              {/* Active dot */}
              {active && !collapsed && (
                <span className={`absolute right-3 w-1.5 h-1.5 rounded-full ${dot}`} />
              )}

              <span className={`flex-shrink-0 ${active && item.color ? "" : active ? "text-white" : ""}`}>
                {item.icon}
              </span>

              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}

              {/* Tooltip when collapsed */}
              {collapsed && (
                <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-slate-700/60 shadow-xl z-50">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-slate-700/60 my-2" />

      {/* Bottom nav */}
      <nav className="px-3 pb-3 space-y-1">
        {BOTTOM_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all group relative
                ${active ? "bg-white/10 text-white border border-white/10" : "text-slate-400 hover:text-white hover:bg-slate-700/50"}
                ${collapsed ? "justify-center" : ""}
              `}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              {collapsed && (
                <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-slate-700/60 shadow-xl z-50">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}

        {/* User card */}
        {!collapsed && (
          <div className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/40">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">Admin</p>
              <p className="text-slate-500 text-xs truncate">admin@travel.com</p>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex justify-center mt-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}