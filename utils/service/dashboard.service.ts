import api from "@/lib/axios";

export interface DashboardStats {
  counts: {
    categories: number;
    destinations: number;
    packages: number;
    images: number;
  };
  values: {
    totalPackageValue: number;
    avgPackagePrice: number;
    maxPackagePrice: number;
    minPackagePrice: number;
    totalDestinationValue: number;
    avgDestinationPrice: number;
  };
  recentDestinations: {
    id: number;
    title: string;
    price: number | null;
    createdAt: string;
    category: { name: string; slug: string } | null;
    _count: { images: number };
  }[];
  recentPackages: {
    id: number;
    title: string;
    price: number;
    createdAt: string;
    category: { name: string } | null;
    destination: { title: string } | null;
    _count: { images: number };
  }[];
  categoryBreakdown: {
    name: string;
    slug: string;
    packages: number;
    destinations: number;
  }[];
  topPackages: {
    id: number;
    title: string;
    price: number;
    category: { name: string } | null;
    destination: { title: string } | null;
  }[];
  monthlyData: {
    labels: string[];
    packages: number[];
    destinations: number[];
  };
}

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await api.get<DashboardStats>("/stats");
    return data;
  },
};