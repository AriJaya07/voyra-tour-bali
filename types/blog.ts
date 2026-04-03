export interface Category {
  id: string | number;
  codeCat?: string;
  displayCat: string;
  description?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Destination {
  id: string | number;
  title: string;
  description: string;
  content?: string;
  image: string;
  categoryName?: string;
  categoryId?: string | number;
  location?: string | { id?: any; title?: string; address?: string };
  createdAt: string;
  updatedAt?: string;
}

export interface EventItem {
  id: string | number;
  title: string;
  description: string;
  content?: string;
  image: string;
  schedule: string;
  location?: string | { id?: any; title?: string; address?: string };
  createdAt: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}
