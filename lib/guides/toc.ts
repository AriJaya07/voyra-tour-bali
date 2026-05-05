export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

const HEADING_RE = /^(#{2,3})\s+(.+?)\s*$/gm;

/**
 * Parse H2/H3 headings from markdown body.
 * Skips fenced code blocks so `## stuff` inside ``` blocks is ignored.
 */
export function extractToc(markdown: string): TocItem[] {
  if (!markdown) return [];
  const stripped = markdown.replace(/```[\s\S]*?```/g, "");
  const items: TocItem[] = [];
  const used = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = HEADING_RE.exec(stripped)) !== null) {
    const level = match[1].length === 2 ? 2 : 3;
    const text = match[2].trim();
    let id = slugifyHeading(text) || `section-${items.length + 1}`;
    let n = 2;
    while (used.has(id)) id = `${id}-${n++}`;
    used.add(id);
    items.push({ id, text, level });
  }
  return items;
}
