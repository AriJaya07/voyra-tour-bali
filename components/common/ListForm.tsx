export const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

export type FilterType = "all" | "destinations" | "packages" | "unlinked";
export type ViewMode = "grid" | "list";