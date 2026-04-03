import { Category, Destination, EventItem } from "@/types/blog";

const API_BASE_URL = process.env.BALI_NEWS_API || "https://traveller-be.onrender.com";

/**
 * Image helper
 */
export function getImageUrl(path: string | undefined): string {
  if (!path) return "/images/placeholder.jpg";
  if (path.startsWith("http")) return path;
  
  // Clean up paths starting with slash or without
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Base Fetch Wrapper
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

    const data = await res.json();
    // Assuming data is either wrapped in a `data` field or returned directly
    return (data.data !== undefined ? data.data : data) as T;
  } catch (error) {
    console.error(`Fetch error on ${endpoint}:`, error);
    return null;
  }
}

/**
 * 1. Categories
 * GET /category/list/all
 */
export async function getCategories(): Promise<Category[]> {
  const data = await fetchNewsApi<Category[]>("/category/list/all");
  return data || [];
}

/**
 * 2. Destinations (Blog List)
 * GET /destinations/list/all
 */
export async function getAllDestinations(): Promise<Destination[]> {
  const data = await fetchNewsApi<Destination[]>("/destinations/list/all");
  return data || [];
}

/**
 * 3. Destination Detail
 * GET /destinations/detail/{id}
 */
export async function getDestinationDetail(id: string | number): Promise<Destination | null> {
  return await fetchNewsApi<Destination>(`/destinations/detail/${id}`);
}

/**
 * 4. Home Highlight
 * GET /home/list?orderBy=createdAt&orderType=DESC
 */
export async function getHomeHighlights(): Promise<Destination[]> {
  const data = await fetchNewsApi<Destination[]>("/home/list?orderBy=createdAt&orderType=DESC");
  return data || [];
}

/**
 * 5. Events
 * GET /event/list/all
 */
export async function getAllEvents(): Promise<EventItem[]> {
  const data = await fetchNewsApi<EventItem[]>("/event/list/all");
  return data || [];
}

/**
 * 6. Event Detail
 * GET /event/detail/{id}
 */
export async function getEventDetail(id: string | number): Promise<EventItem | null> {
  return await fetchNewsApi<EventItem>(`/event/detail/${id}`);
}
