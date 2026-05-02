"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/components/common/ConfirmDialog";

interface Guide {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImage: string | null;
  region: string | null;
  tags: string[];
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  views: number;
  updatedAt: string;
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function AdminGuidesPage() {
  const confirm = useConfirm();
  const [list, setList] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Guide | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [region, setRegion] = useState("");
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">("DRAFT");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/admin/guides", { cache: "no-store" });
    if (res.ok) setList(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setTitle("");
    setExcerpt("");
    setBody("");
    setCoverImage("");
    setRegion("");
    setTags("");
    setStatus("DRAFT");
    setError(null);
    setEditing(null);
    setCreating(false);
  };

  const startEdit = (g: Guide) => {
    setEditing(g);
    setTitle(g.title);
    setExcerpt(g.excerpt);
    setBody(g.body);
    setCoverImage(g.coverImage || "");
    setRegion(g.region || "");
    setTags(g.tags.join(", "));
    setStatus(g.status);
    setCreating(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        excerpt,
        body,
        coverImage: coverImage || null,
        region: region || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        status,
      };
      const res = editing
        ? await fetch(`/api/admin/guides/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/guides", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d?.error || "Save failed");
        return;
      }
      await load();
      reset();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const ok = await confirm({
      title: "Delete this guide?",
      description: "Published content will be removed and any deep links will break.",
      confirmLabel: "Delete guide",
      cancelLabel: "Keep it",
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/admin/guides/${id}`, { method: "DELETE" });
    setList((s) => s.filter((g) => g.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Travel Guides</h1>
            <p className="text-sm text-gray-500 mt-1">Long-form Bali content. Markdown body.</p>
          </div>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="px-4 py-2.5 bg-[#0071CE] hover:bg-[#005ba6] text-white text-sm font-bold rounded-lg transition shadow-sm"
            >
              + New Guide
            </button>
          )}
        </div>

        {creating && (
          <form
            onSubmit={submit}
            className="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-sm mb-6 space-y-3"
          >
            <h2 className="font-bold text-gray-900">{editing ? "Edit" : "New"} guide</h2>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title *"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg"
            />
            <input
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Excerpt (one line summary)"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg"
            />
            <textarea
              required
              minLength={50}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Body (markdown supported, min 50 chars) *"
              rows={10}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg font-mono"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="Cover image URL"
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg"
              />
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Region (Ubud, Canggu…)"
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg"
              />
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags (comma separated)"
                className="px-3 py-2.5 text-sm border border-gray-200 rounded-lg"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-gray-700">Status:</label>
              {(["DRAFT", "PUBLISHED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border ${
                    status === s
                      ? "bg-[#0071CE] text-white border-[#0071CE]"
                      : "bg-white text-gray-700 border-gray-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 text-sm font-bold text-white bg-[#0071CE] hover:bg-[#005ba6] disabled:opacity-60 rounded-lg shadow-sm"
              >
                {saving ? "Saving…" : editing ? "Update" : "Create"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0071CE] border-t-transparent" />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      No guides yet
                    </td>
                  </tr>
                ) : (
                  list.map((g) => (
                    <tr key={g.id}>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        <a href={`/guides/${g.slug}`} target="_blank" className="hover:underline">
                          {g.title}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{g.region || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            g.status === "PUBLISHED"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {g.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{g.views.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtDate(g.updatedAt)}</td>
                      <td className="px-4 py-3 flex gap-1.5 justify-end">
                        <button
                          onClick={() => startEdit(g)}
                          className="px-2.5 py-1 text-xs font-bold text-[#0071CE] bg-blue-50 hover:bg-blue-100 rounded transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => remove(g.id)}
                          className="px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded transition"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
