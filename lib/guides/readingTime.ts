/**
 * Reading-time estimate from markdown body.
 * Strips fenced code + inline tokens before counting words. ~200 wpm.
 */
export function estimateReadingMinutes(markdown: string): number {
  if (!markdown) return 1;
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/[#>*_~\-]/g, " ");
  const words = stripped.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export const GUIDE_THEMES = [
  "adventure",
  "culture",
  "food",
  "wellness",
  "family",
  "budget",
  "nature",
  "beach",
] as const;

export type GuideTheme = (typeof GUIDE_THEMES)[number];
