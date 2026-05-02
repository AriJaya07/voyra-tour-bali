"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTheme } from "@/components/Dashboard/ThemeProvider";
import { useConfirm } from "@/components/common/ConfirmDialog";
import NotificationCategoryBadge from "@/components/notifications/NotificationCategoryBadge";

// ── Types ───────────────────────────────────────────────────────────────

interface Template {
  id: number;
  key: string;
  title: string;
  body: string;
  category: string;
  url: string | null;
  iconKey: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: number; name: string | null };
  _count: { broadcasts: number };
}

interface Broadcast {
  id: number;
  templateId: number | null;
  template: { id: number; key: string; title: string } | null;
  title: string;
  body: string;
  category: string;
  url: string | null;
  audience: string;
  audienceIds: number[] | null;
  channels: { inApp: boolean; push: boolean; email: boolean };
  scheduledAt: string | null;
  sentAt: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  createdBy: { id: number; name: string | null };
  _count: { notifications: number };
}

const CATEGORIES = ["SYSTEM", "DEAL", "TRAVEL", "ALERT", "NEWS"] as const;
const AUDIENCES: { id: "ALL" | "ROLE_USER" | "ROLE_ADMIN" | "USER_LIST"; label: string }[] = [
  { id: "ALL", label: "All users" },
  { id: "ROLE_USER", label: "Customers (USER)" },
  { id: "ROLE_ADMIN", label: "Admins" },
  { id: "USER_LIST", label: "Specific user IDs" },
];

const STATUS_PILL: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: "bg-slate-500/15", text: "text-slate-400", label: "Draft" },
  SCHEDULED: { bg: "bg-blue-500/15", text: "text-blue-400", label: "Scheduled" },
  SENDING: { bg: "bg-amber-500/15 animate-pulse", text: "text-amber-400", label: "Sending" },
  SENT: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Sent" },
  FAILED: { bg: "bg-red-500/15", text: "text-red-400", label: "Failed" },
  CANCELLED: { bg: "bg-gray-500/15", text: "text-gray-400", label: "Cancelled" },
};

// ── Theme classes ───────────────────────────────────────────────────────

function useT(theme: "dark" | "light") {
  const dark = theme === "dark";
  return {
    page: dark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900",
    card: dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200",
    tabActive: dark ? "bg-gray-800 text-white" : "bg-white text-gray-900 shadow-sm",
    tabIdle: dark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900",
    tabBar: dark ? "bg-gray-900 border-gray-800" : "bg-gray-100 border-gray-200",
    input:
      dark
        ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500"
        : "bg-white border-gray-300 text-gray-900 placeholder-gray-400",
    label: dark ? "text-gray-300" : "text-gray-700",
    sub: dark ? "text-gray-400" : "text-gray-500",
    chip: dark ? "bg-gray-800 border-gray-700 text-gray-200" : "bg-gray-100 border-gray-200 text-gray-700",
    chipActive: "bg-[#0071CE] border-[#0071CE] text-white",
    rowHover: dark ? "hover:bg-gray-800/40" : "hover:bg-gray-50",
    divider: dark ? "divide-gray-800/60" : "divide-gray-100",
    headRow: dark ? "border-gray-800 text-gray-400" : "border-gray-200 text-gray-500",
    btnPrimary: "bg-[#0071CE] hover:bg-[#005ba6] text-white",
    btnGhost: dark ? "bg-gray-800 hover:bg-gray-700 text-gray-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700",
    btnDanger: "bg-red-600 hover:bg-red-700 text-white",
  };
}

// ── Page ────────────────────────────────────────────────────────────────

type Tab = "broadcasts" | "templates" | "compose";

export default function AdminNotificationsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const { theme } = useTheme();
  const t = useT(theme);
  const confirm = useConfirm();

  const [tab, setTab] = useState<Tab>("broadcasts");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") router.push("/login?callbackUrl=/dashboard/notifications");
    else if (sessionStatus === "authenticated" && (session?.user as { role?: string })?.role !== "ADMIN") {
      router.push("/");
    }
  }, [sessionStatus, session, router]);

  const refreshTemplates = async () => {
    const res = await fetch("/api/admin/notifications/templates", { cache: "no-store" });
    if (res.ok) setTemplates(await res.json());
  };
  const refreshBroadcasts = async () => {
    const res = await fetch("/api/admin/notifications/broadcasts", { cache: "no-store" });
    if (res.ok) setBroadcasts(await res.json());
  };

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    (async () => {
      try {
        await Promise.all([refreshTemplates(), refreshBroadcasts()]);
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionStatus]);

  if (sessionStatus !== "authenticated" || (session?.user as { role?: string })?.role !== "ADMIN") {
    return (
      <div className={`min-h-screen ${t.page} flex items-center justify-center`}>
        <p className="text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${t.page} pt-8 pb-16 px-4 sm:px-8`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Notifications</h1>
            <p className={`text-sm mt-1 ${t.sub}`}>
              Compose, schedule and broadcast announcements to your users.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTab("compose")}
            className={`shrink-0 px-4 py-2.5 text-xs font-bold rounded-xl ${t.btnPrimary} transition shadow-sm`}
          >
            + Compose broadcast
          </button>
        </div>

        <div className={`inline-flex p-1 rounded-xl border ${t.tabBar} mb-5`}>
          {[
            { id: "broadcasts", label: "Broadcasts" },
            { id: "templates", label: "Templates" },
            { id: "compose", label: "Compose" },
          ].map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setTab(b.id as Tab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                tab === b.id ? t.tabActive : t.tabIdle
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#0071CE] border-t-transparent" />
          </div>
        ) : tab === "broadcasts" ? (
          <BroadcastsTab
            theme={theme}
            broadcasts={broadcasts}
            onChange={refreshBroadcasts}
            confirmFn={confirm}
          />
        ) : tab === "templates" ? (
          <TemplatesTab
            theme={theme}
            templates={templates}
            onChange={refreshTemplates}
            confirmFn={confirm}
          />
        ) : (
          <ComposeTab
            theme={theme}
            templates={templates}
            onCreated={async () => {
              await refreshBroadcasts();
              setTab("broadcasts");
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Broadcasts table ───────────────────────────────────────────────────

function BroadcastsTab({
  theme,
  broadcasts,
  onChange,
  confirmFn,
}: {
  theme: "dark" | "light";
  broadcasts: Broadcast[];
  onChange: () => Promise<void>;
  confirmFn: (opts: {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  }) => Promise<boolean>;
}) {
  const t = useT(theme);

  const send = async (id: number) => {
    const ok = await confirmFn({
      title: "Send this broadcast now?",
      description: "Notifications will be delivered to the targeted audience immediately.",
      confirmLabel: "Send now",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/notifications/broadcasts/${id}/send`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      toast.success("Broadcast sent", {
        description: `Delivered ${data.delivered} · push ${data.pushSent} · email ${data.emailSent}`,
      });
      onChange();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error("Could not send", { description: data?.error ?? "Try again." });
    }
  };

  const cancel = async (id: number) => {
    const ok = await confirmFn({
      title: "Cancel this scheduled broadcast?",
      description: "It will not be sent. You can still edit and reschedule it later.",
      confirmLabel: "Cancel broadcast",
      cancelLabel: "Keep schedule",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/notifications/broadcasts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancel: true }),
    });
    if (res.ok) {
      toast.success("Broadcast cancelled");
      onChange();
    } else toast.error("Could not cancel");
  };

  const remove = async (id: number) => {
    const ok = await confirmFn({
      title: "Delete this broadcast?",
      description: "This permanently removes the broadcast record. Inbox copies are kept for users.",
      confirmLabel: "Delete broadcast",
      cancelLabel: "Keep it",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/notifications/broadcasts/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Broadcast deleted");
      onChange();
    } else toast.error("Could not delete");
  };

  if (broadcasts.length === 0) {
    return (
      <div className={`${t.card} border rounded-2xl p-12 text-center`}>
        <p className="text-3xl mb-2" aria-hidden>
          📬
        </p>
        <p className="font-bold mb-1">No broadcasts yet</p>
        <p className={`text-sm ${t.sub}`}>Compose your first announcement.</p>
      </div>
    );
  }

  return (
    <div className={`${t.card} border rounded-2xl overflow-hidden`}>
      <div className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 text-[11px] font-bold uppercase tracking-wider border-b ${t.headRow}`}>
        <div>Title</div>
        <div>Category</div>
        <div>Audience</div>
        <div>Schedule</div>
        <div>Status</div>
        <div>Actions</div>
      </div>
      <div className={`divide-y ${t.divider}`}>
        {broadcasts.map((b) => {
          const status = STATUS_PILL[b.status] ?? STATUS_PILL.DRAFT;
          return (
            <div
              key={b.id}
              className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 items-start text-sm ${t.rowHover}`}
            >
              <div className="min-w-0">
                <p className="font-bold truncate">{b.title}</p>
                <p className={`text-[11px] ${t.sub} truncate`}>{b.body.slice(0, 100)}</p>
                {b.template && (
                  <p className={`text-[10px] ${t.sub} mt-0.5`}>From template · {b.template.key}</p>
                )}
              </div>
              <div>
                <NotificationCategoryBadge category={b.category} />
              </div>
              <div className="text-xs">
                {b.audience === "USER_LIST"
                  ? `${b.audienceIds?.length ?? 0} users`
                  : b.audience.replace("ROLE_", "").toLowerCase()}
              </div>
              <div className="text-xs">
                {b.sentAt
                  ? `Sent ${new Date(b.sentAt).toLocaleString()}`
                  : b.scheduledAt
                  ? new Date(b.scheduledAt).toLocaleString()
                  : "—"}
                <br />
                <span className={`text-[10px] ${t.sub}`}>
                  {b._count.notifications} delivered
                </span>
              </div>
              <div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
                {b.errorMessage && (
                  <p className="text-[10px] text-red-400 mt-1 truncate" title={b.errorMessage}>
                    {b.errorMessage}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 items-end">
                {(b.status === "DRAFT" || b.status === "SCHEDULED") && (
                  <button
                    type="button"
                    onClick={() => send(b.id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${t.btnPrimary} transition`}
                  >
                    Send now
                  </button>
                )}
                {b.status === "SCHEDULED" && (
                  <button
                    type="button"
                    onClick={() => cancel(b.id)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg ${t.btnGhost} transition`}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(b.id)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-red-500 hover:bg-red-500/10 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Templates ──────────────────────────────────────────────────────────

function TemplatesTab({
  theme,
  templates,
  onChange,
  confirmFn,
}: {
  theme: "dark" | "light";
  templates: Template[];
  onChange: () => Promise<void>;
  confirmFn: (opts: {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
  }) => Promise<boolean>;
}) {
  const t = useT(theme);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    key: "",
    title: "",
    body: "",
    category: "SYSTEM",
    url: "",
  });

  const create = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/notifications/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error("Could not create template", { description: data?.error });
        return;
      }
      toast.success("Template saved");
      setForm({ key: "", title: "", body: "", category: "SYSTEM", url: "" });
      onChange();
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: number, key: string) => {
    const ok = await confirmFn({
      title: `Delete template "${key}"?`,
      description: "Existing broadcasts referencing this template will keep their content snapshot.",
      confirmLabel: "Delete template",
      cancelLabel: "Keep it",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/notifications/templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Template deleted");
      onChange();
    } else toast.error("Could not delete");
  };

  return (
    <div className="space-y-5">
      <div className={`${t.card} border rounded-2xl p-5`}>
        <h2 className="font-bold mb-4">New template</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={`block text-xs font-bold ${t.label} mb-1`}>Key</label>
            <input
              type="text"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              placeholder="weekly-deals"
              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 ${t.input}`}
            />
          </div>
          <div>
            <label className={`block text-xs font-bold ${t.label} mb-1`}>Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className={`w-full px-3 py-2 text-sm rounded-lg border ${t.input}`}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={`block text-xs font-bold ${t.label} mb-1`}>Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={120}
              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 ${t.input}`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={`block text-xs font-bold ${t.label} mb-1`}>Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={4}
              maxLength={4000}
              className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 ${t.input}`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={`block text-xs font-bold ${t.label} mb-1`}>Optional URL</label>
            <input
              type="text"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="/profile/inbox or https://…"
              className={`w-full px-3 py-2 text-sm rounded-lg border ${t.input}`}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={create}
          disabled={creating || form.key.length < 2 || form.title.length < 2 || form.body.length < 4}
          className={`mt-4 px-4 py-2 text-xs font-bold rounded-lg ${t.btnPrimary} transition disabled:opacity-60`}
        >
          {creating ? "Saving…" : "Save template"}
        </button>
      </div>

      <div className={`${t.card} border rounded-2xl overflow-hidden`}>
        <div className={`grid grid-cols-[1fr_2fr_1fr_auto] gap-3 px-5 py-3 text-[11px] font-bold uppercase tracking-wider border-b ${t.headRow}`}>
          <div>Key</div>
          <div>Title</div>
          <div>Category</div>
          <div>Actions</div>
        </div>
        {templates.length === 0 ? (
          <div className={`p-12 text-center text-sm ${t.sub}`}>No templates yet.</div>
        ) : (
          <div className={`divide-y ${t.divider}`}>
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className={`grid grid-cols-[1fr_2fr_1fr_auto] gap-3 px-5 py-3 text-sm items-center ${t.rowHover}`}
              >
                <div className="font-mono text-xs truncate">{tpl.key}</div>
                <div>
                  <p className="font-bold truncate">{tpl.title}</p>
                  <p className={`text-[11px] ${t.sub} truncate`}>{tpl.body.slice(0, 80)}</p>
                </div>
                <div>
                  <NotificationCategoryBadge category={tpl.category} />
                </div>
                <button
                  type="button"
                  onClick={() => remove(tpl.id, tpl.key)}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg text-red-500 hover:bg-red-500/10 transition"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Compose ────────────────────────────────────────────────────────────

function ComposeTab({
  theme,
  templates,
  onCreated,
}: {
  theme: "dark" | "light";
  templates: Template[];
  onCreated: () => Promise<void>;
}) {
  const t = useT(theme);
  const [templateId, setTemplateId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("SYSTEM");
  const [url, setUrl] = useState("");
  const [audience, setAudience] = useState<"ALL" | "ROLE_USER" | "ROLE_ADMIN" | "USER_LIST">("ALL");
  const [audienceIdsText, setAudienceIdsText] = useState("");
  const [push, setPush] = useState(false);
  const [email, setEmail] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const audienceIds = useMemo(
    () =>
      audienceIdsText
        .split(/[,\s]+/)
        .map((s) => parseInt(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0),
    [audienceIdsText]
  );

  const applyTemplate = (id: number) => {
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setTitle(tpl.title);
    setBody(tpl.body);
    setCategory(tpl.category as (typeof CATEGORIES)[number]);
    setUrl(tpl.url || "");
  };

  const submit = async (action: "draft" | "schedule" | "send" | "test") => {
    if (title.trim().length < 2) {
      toast.error("Title is required");
      return;
    }
    if (body.trim().length < 4) {
      toast.error("Body is too short");
      return;
    }
    if (audience === "USER_LIST" && audienceIds.length === 0) {
      toast.error("Add at least one user ID");
      return;
    }
    if (action === "schedule" && !scheduledAt) {
      toast.error("Pick a schedule time");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/notifications/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          templateId: templateId || null,
          title,
          body,
          category,
          url: url || null,
          audience,
          audienceIds,
          channels: { inApp: true, push, email },
          scheduledAt: scheduleEnabled && scheduledAt ? scheduledAt : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Could not save broadcast", { description: data?.error });
        return;
      }
      if (action === "test") {
        toast.success("Test sent to your inbox");
      } else if (action === "send") {
        toast.success("Broadcast sent");
      } else if (action === "schedule") {
        toast.success("Scheduled");
      } else {
        toast.success("Saved as draft");
      }
      if (action !== "test") {
        await onCreated();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${t.card} border rounded-2xl p-5 space-y-5`}>
      <div>
        <label className={`block text-xs font-bold ${t.label} mb-1`}>Use template (optional)</label>
        <select
          value={templateId}
          onChange={(e) => {
            const v = e.target.value ? parseInt(e.target.value) : "";
            setTemplateId(v as number | "");
            if (typeof v === "number") applyTemplate(v);
          }}
          className={`w-full sm:max-w-md px-3 py-2 text-sm rounded-lg border ${t.input}`}
        >
          <option value="">— Ad-hoc —</option>
          {templates.map((tpl) => (
            <option key={tpl.id} value={tpl.id}>
              {tpl.key} · {tpl.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={`block text-xs font-bold ${t.label} mb-1`}>Category *</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-full border transition ${
                  category === c ? t.chipActive : t.chip
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={`block text-xs font-bold ${t.label} mb-1`}>Audience *</label>
          <div className="flex flex-wrap gap-1.5">
            {AUDIENCES.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAudience(a.id)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-full border transition ${
                  audience === a.id ? t.chipActive : t.chip
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          {audience === "USER_LIST" && (
            <input
              type="text"
              value={audienceIdsText}
              onChange={(e) => setAudienceIdsText(e.target.value)}
              placeholder="Comma or space separated user IDs"
              className={`mt-2 w-full px-3 py-2 text-sm rounded-lg border ${t.input}`}
            />
          )}
        </div>
      </div>

      <div>
        <label className={`block text-xs font-bold ${t.label} mb-1`}>Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 ${t.input}`}
        />
      </div>

      <div>
        <label className={`block text-xs font-bold ${t.label} mb-1`}>Body *</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Markdown supported: **bold**, *italics*, line breaks."
          className={`w-full px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 ${t.input}`}
        />
      </div>

      <div>
        <label className={`block text-xs font-bold ${t.label} mb-1`}>Deep link URL (optional)</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/wishlist or https://example.com"
          className={`w-full px-3 py-2 text-sm rounded-lg border ${t.input}`}
        />
      </div>

      <div>
        <label className={`block text-xs font-bold ${t.label} mb-2`}>Channels</label>
        <div className="flex flex-wrap gap-2">
          <span className={`px-3 py-1.5 text-xs font-bold rounded-full border ${t.chipActive}`}>
            ✓ In-app (always)
          </span>
          <button
            type="button"
            onClick={() => setPush((v) => !v)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
              push ? t.chipActive : t.chip
            }`}
          >
            {push ? "✓ " : ""}Push
          </button>
          <button
            type="button"
            onClick={() => setEmail((v) => !v)}
            className={`px-3 py-1.5 text-xs font-bold rounded-full border transition ${
              email ? t.chipActive : t.chip
            }`}
          >
            {email ? "✓ " : ""}Email
          </button>
        </div>
      </div>

      <div>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={scheduleEnabled}
            onChange={(e) => setScheduleEnabled(e.target.checked)}
            className="h-4 w-4"
          />
          <span className={`text-xs font-bold ${t.label}`}>Schedule for later</span>
        </label>
        {scheduleEnabled && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className={`mt-2 w-full sm:max-w-xs px-3 py-2 text-sm rounded-lg border ${t.input}`}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          onClick={() => submit("send")}
          disabled={submitting || scheduleEnabled}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl ${t.btnPrimary} transition shadow-sm disabled:opacity-60`}
        >
          {submitting ? "Sending…" : "Send now"}
        </button>
        {scheduleEnabled && (
          <button
            type="button"
            onClick={() => submit("schedule")}
            disabled={submitting}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl ${t.btnPrimary} transition shadow-sm disabled:opacity-60`}
          >
            {submitting ? "Scheduling…" : "Schedule"}
          </button>
        )}
        <button
          type="button"
          onClick={() => submit("draft")}
          disabled={submitting}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl ${t.btnGhost} transition disabled:opacity-60`}
        >
          Save as draft
        </button>
        <button
          type="button"
          onClick={() => submit("test")}
          disabled={submitting}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl ${t.btnGhost} transition disabled:opacity-60`}
        >
          Send test to me
        </button>
      </div>
    </div>
  );
}
