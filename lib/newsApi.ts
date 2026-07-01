import {
  Category,
  Destination,
  EventItem,
  LocationRef,
  PaginatedResponse,
} from "@/types/blog";

const API_BASE_URL = process.env.BALI_NEWS_API || "https://be.balitravelnow.com";

/**
 * Image helper — absolute URL passthrough, else prefix API base.
 */
export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "/images/placeholder.jpg";
  if (path.startsWith("http")) return path;

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Base fetch wrapper.
 * Unwraps the { data, meta } envelope; returns null on { error } or HTTP error.
 */
async function fetchNewsApi<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      // Default revalidation to 60 seconds (ISR)
      next: { revalidate: 60, ...options?.next },
    });

    if (!res.ok) {
      console.error(`API Error on ${url}: ${res.statusText}`);
      return null;
    }

    const json = await res.json();
    // Error envelope
    if (json && json.error) {
      console.error(`API returned error on ${url}:`, json.error);
      return null;
    }
    // Unwrap { data } envelope, else return raw
    return (json && json.data !== undefined ? json.data : json) as T;
  } catch (error) {
    console.error(`Fetch error on ${endpoint}:`, error);
    return null;
  }
}

/**
 * Normalizes list payloads: accepts either a raw array or a
 * paginated { totalPage, pageIndex, list } wrapper.
 */
function toList<T>(payload: T[] | PaginatedResponse<T> | null): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.list || [];
}

/**
 * 1. Categories
 * GET /category/list/all
 */
export async function getCategories(): Promise<Category[]> {
  const data = await fetchNewsApi<Category[] | PaginatedResponse<Category>>("/category/list/all");
  return toList(data);
}

/**
 * 2. Destinations (Blog list)
 * GET /destinations/list/all
 */
export async function getAllDestinations(): Promise<Destination[]> {
  const data = await fetchNewsApi<Destination[] | PaginatedResponse<Destination>>(
    "/destinations/list/all"
  );
  return toList(data);
}

/**
 * 3. Destination detail
 * GET /destinations/detail/{id}
 */
export async function getDestinationDetail(id: string | number): Promise<Destination | null> {
  return await fetchNewsApi<Destination>(`/destinations/detail/${id}`);
}

/**
 * 4. Home highlight
 * GET /feed/home → { hero, trending, forYou, latest, ... } (FeedItem[])
 * Falls back to recommended destinations if the feed is unavailable.
 */
export async function getHomeHighlights(): Promise<Destination[]> {
  const feed = await fetchNewsApi<{
    hero?: Destination[];
    trending?: Destination[];
    forYou?: Destination[];
    latest?: Destination[];
  }>("/feed/home");

  const highlights =
    feed?.hero?.length
      ? feed.hero
      : feed?.forYou?.length
      ? feed.forYou
      : feed?.latest || [];

  if (highlights.length) return highlights;

  // Fallback: recommended destinations, newest first
  const all = await getAllDestinations();
  return all
    .filter((d) => d.recommend === 1 || d.recommend === undefined)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

/**
 * 5. Events (list)
 * GET /event/list/all
 */
export async function getAllEvents(): Promise<EventItem[]> {
  const data = await fetchNewsApi<EventItem[] | PaginatedResponse<EventItem>>("/event/list/all");
  return toList(data);
}

/**
 * 6. Event detail
 * GET /event/detail/{id}
 */
export async function getEventDetail(id: string | number): Promise<EventItem | null> {
  return await fetchNewsApi<EventItem>(`/event/detail/${id}`);
}

/* ── View helpers ─────────────────────────────────────────────
 * The new backend returns nested category/location objects instead of
 * flat strings. These normalize the shape for the UI.
 */

/** Category display name from nested object, legacy field, or category slug. */
export function getCategoryName(
  item: { category?: Category | null; categoryName?: string }
): string | undefined {
  return item.category?.displayCat || item.categoryName || item.category?.codeCat;
}

/** Location text from string, nested object title, or address. */
export function getLocationText(
  location: string | LocationRef | null | undefined
): string | undefined {
  if (!location) return undefined;
  if (typeof location === "string") return location;
  return location.title || location.address;
}

/** Best available image: primary, then banner, then background. */
export function getCardImage(
  item: { image?: string | null; imageBanner?: string | null; imageBackground?: string | null }
): string {
  return getImageUrl(item.image || item.imageBanner || item.imageBackground);
}

/** Summary text: description, then feed excerpt. */
export function getSummary(
  item: { description?: string | null; excerpt?: string | null }
): string {
  return item.description || item.excerpt || "";
}
