/**
 * Backend: https://be.balitravelnow.com
 * Every response wrapped in envelope { data, meta }. Errors: { error: { code, message } }.
 * "Article" = destination (type: "destination"). Events are their own entity.
 */

export interface Category {
  id: string | number;
  codeCat?: string;        // slug/code, e.g. "temple"
  displayCat: string;      // display name
  description?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationRef {
  id?: string | number;
  title?: string;
  address?: string;
  image?: string;          // detail location also has image
}

export interface ImageAttribution {
  source?: string;
  author?: string;
  license?: string;
  url?: string;
}

export interface Destination {
  id: string | number;
  type?: "destination";
  title: string;
  description?: string | null;
  content?: string | null;             // long HTML/text
  image?: string | null;
  imageBanner?: string | null;
  imageBackground?: string | null;
  imageAttribution?: ImageAttribution | null;
  categoryId?: string | number | null;
  locationId?: string | number | null;
  resource?: string | null;            // external URL
  recommend?: number;                  // 1 = recommended
  status?: number;                     // 1 = active, 0 = inactive
  // nested objects (present on list rows / entity, absent on mobile detail)
  category?: Category | null;
  location?: string | LocationRef | null;
  // feed row alias for description
  excerpt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface EventItem {
  id: string | number;
  type?: "event";
  title: string;
  description?: string | null;
  content?: string | null;
  image?: string | null;
  imageBanner?: string | null;
  imageBackground?: string | null;
  imageAttribution?: ImageAttribution | null;
  schedule?: string | null;            // e.g. "2026-06-01 10:00"
  status?: number | null;              // 1 = active, 0 = inactive
  categoryId?: string | number | null;
  locationId?: string | number | null;
  resource?: string | null;
  category?: Category | null;
  location?: string | LocationRef | null;
  createdAt: string;
  updatedAt?: string;
}

/** Paginated list wrapper — page is 0-indexed. */
export interface PaginatedResponse<T> {
  totalPage: number;
  pageIndex: number;
  list: T[];
}

/** Response envelope. */
export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: { code: string; message: string };
}
