export interface GuideListItem {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string | null;
  region: string | null;
  tags: string[];
  publishedAt: string | null;
  views: number;
  readingMinutes: number;
}

export interface TourGuideRailItem {
  id: number;
  slug: string;
  name: string;
  photo: string | null;
  yearsActive: number;
  rating: number;
  reviewCount: number;
  languages: string[];
}

export interface BaliNoteFallbackItem {
  id: number;
  targetTitle: string | null;
  targetType: string;
  body: string;
  rating: number | null;
  date: string | null;
}
