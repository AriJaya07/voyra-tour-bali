/**
 * RAG retrieval service (F1, keyless variant).
 *
 * Grounds the Concierge/chat in Voyra's OWNED content corpus so answers can
 * cite real pages instead of sounding like a generic LLM. Uses PostgreSQL
 * native full-text search (`to_tsvector` / `websearch_to_tsquery` / `ts_rank`)
 * — all core Postgres, no pgvector extension and no paid embeddings provider.
 *
 * Optional performance indexes (safe to add later, not required for correctness):
 *   CREATE INDEX IF NOT EXISTS idx_guide_fts ON "Guide"
 *     USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(body,'')));
 *   CREATE INDEX IF NOT EXISTS idx_dest_fts ON "Destination"
 *     USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));
 *   CREATE INDEX IF NOT EXISTS idx_event_fts ON "BaliEvent"
 *     USING GIN (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(impact,'')));
 *   CREATE INDEX IF NOT EXISTS idx_note_fts ON "BaliNote"
 *     USING GIN (to_tsvector('english', coalesce("targetTitle",'') || ' ' || coalesce(body,'')));
 */

import { prisma } from "@/lib/prisma";

export type RagSourceType = "guide" | "destination" | "event" | "note";

export interface RagChunk {
  sourceType: RagSourceType;
  sourceId: number;
  title: string;
  snippet: string;
  href: string;
  rank: number;
}

interface RawRow {
  id: number;
  title: string | null;
  snippet: string | null;
  slug: string | null;
  rank: number | null;
}

function clampSnippet(text: string | null, max = 320): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function toNum(v: number | null): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * Semantic-ish search across the owned corpus. Returns the top `limit` chunks
 * ranked by full-text relevance across all sources. Never throws — retrieval
 * failure degrades to an empty context (ungrounded answer) rather than a 500.
 */
export async function semanticSearch(query: string, limit = 5): Promise<RagChunk[]> {
  const q = query.trim().slice(0, 300);
  if (q.length < 3) return [];

  const perSource = Math.max(2, Math.ceil(limit / 2));

  try {
    const [guides, dests, events, notes] = await Promise.all([
      // Guides (published only)
      prisma.$queryRaw<RawRow[]>`
        SELECT id, title,
               left(coalesce(excerpt, body), 400) AS snippet,
               slug,
               ts_rank(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(body,'')),
                       websearch_to_tsquery('english', ${q})) AS rank
        FROM "Guide"
        WHERE status = 'PUBLISHED'
          AND to_tsvector('english', coalesce(title,'') || ' ' || coalesce(excerpt,'') || ' ' || coalesce(body,''))
              @@ websearch_to_tsquery('english', ${q})
        ORDER BY rank DESC
        LIMIT ${perSource}
      `,
      // Destinations (curated catalog)
      prisma.$queryRaw<RawRow[]>`
        SELECT id, title,
               left(description, 400) AS snippet,
               slug,
               ts_rank(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')),
                       websearch_to_tsquery('english', ${q})) AS rank
        FROM "Destination"
        WHERE to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))
              @@ websearch_to_tsquery('english', ${q})
        ORDER BY rank DESC
        LIMIT ${perSource}
      `,
      // Cultural calendar
      prisma.$queryRaw<RawRow[]>`
        SELECT id, name AS title,
               left(coalesce(description,'') || ' ' || coalesce(impact,''), 400) AS snippet,
               slug,
               ts_rank(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(impact,'')),
                       websearch_to_tsquery('english', ${q})) AS rank
        FROM "BaliEvent"
        WHERE to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(impact,''))
              @@ websearch_to_tsquery('english', ${q})
        ORDER BY rank DESC
        LIMIT ${perSource}
      `,
      // Community notes (public + approved only) — restores social proof w/o a reviews subsystem
      prisma.$queryRaw<RawRow[]>`
        SELECT id, coalesce("targetTitle", 'Traveller note') AS title,
               left(body, 400) AS snippet,
               NULL AS slug,
               ts_rank(to_tsvector('english', coalesce("targetTitle",'') || ' ' || coalesce(body,'')),
                       websearch_to_tsquery('english', ${q})) AS rank
        FROM "BaliNote"
        WHERE visibility = 'PUBLIC' AND status = 'APPROVED'
          AND to_tsvector('english', coalesce("targetTitle",'') || ' ' || coalesce(body,''))
              @@ websearch_to_tsquery('english', ${q})
        ORDER BY rank DESC
        LIMIT ${perSource}
      `,
    ]);

    const chunks: RagChunk[] = [];

    for (const g of guides) {
      chunks.push({
        sourceType: "guide",
        sourceId: g.id,
        title: g.title ?? "Guide",
        snippet: clampSnippet(g.snippet),
        href: g.slug ? `/guides/${g.slug}` : "/guides",
        rank: toNum(g.rank),
      });
    }
    for (const d of dests) {
      chunks.push({
        sourceType: "destination",
        sourceId: d.id,
        title: d.title ?? "Destination",
        snippet: clampSnippet(d.snippet),
        href: d.slug ? `/detail/${d.slug}` : "/explore",
        rank: toNum(d.rank),
      });
    }
    for (const e of events) {
      chunks.push({
        sourceType: "event",
        sourceId: e.id,
        title: e.title ?? "Bali event",
        snippet: clampSnippet(e.snippet),
        href: "/bali-events",
        rank: toNum(e.rank),
      });
    }
    for (const n of notes) {
      chunks.push({
        sourceType: "note",
        sourceId: n.id,
        title: n.title ?? "Traveller note",
        snippet: clampSnippet(n.snippet),
        href: "/notes",
        rank: toNum(n.rank),
      });
    }

    chunks.sort((a, b) => b.rank - a.rank);
    return chunks.slice(0, limit);
  } catch (error) {
    console.error("[ragService.semanticSearch]", error instanceof Error ? error.message : "Unknown");
    return [];
  }
}

/**
 * Render retrieved chunks into a numbered context block for a system prompt,
 * plus a parallel `sources` array the client renders as citation chips.
 */
export function buildContextBlock(chunks: RagChunk[]): {
  contextText: string;
  sources: { n: number; title: string; href: string; type: RagSourceType }[];
} {
  if (chunks.length === 0) {
    return { contextText: "", sources: [] };
  }
  const lines: string[] = [];
  const sources = chunks.map((c, i) => {
    const n = i + 1;
    lines.push(`[${n}] (${c.sourceType}) ${c.title}: ${c.snippet}`);
    return { n, title: c.title, href: c.href, type: c.sourceType };
  });
  return { contextText: lines.join("\n"), sources };
}
