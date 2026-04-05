"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FaArrowLeft, FaSearch, FaCheck, FaSpinner } from "react-icons/fa";

interface SearchResult {
  productCode: string;
  title: string;
  image?: string;
  price?: number;
  currency?: string;
}

export default function ViatorMockNewPage() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<SearchResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Fetch product detail from Viator using the existing API endpoint
      const res = await fetch(`/api/viator?action=product_detail&productCode=${encodeURIComponent(searchQuery.trim())}&currency=IDR`);
      if (res.ok) {
        const data = await res.json();
        if (data.productCode) {
          // Get best image from the variants
          const imageVariants = data.images?.[0]?.variants || [];
          const sorted = [...imageVariants].sort((a: any, b: any) => Math.abs(a.width - 720) - Math.abs(b.width - 720));
          const img = sorted[0]?.url;
          setSearchResults([{
            productCode: data.productCode,
            title: data.title,
            image: img,
            price: data.pricing?.summary?.fromPrice,
            currency: data.pricing?.currency,
          }]);
        } else {
          toast.error("Product not found. Make sure you entered a valid Product Code.");
          setSearchResults([]);
        }
      } else {
        toast.error("Product not found. Make sure you entered a valid Product Code.");
        setSearchResults([]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to search product.");
    } finally {
      setIsSearching(false);
    }
  };

  const generateSlug = () => {
    if (!selectedProduct) return;
    const base = selectedProduct.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const randomStr = Math.random().toString(36).substring(2, 6);
    setSlug(`${base}-${randomStr}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error("Please select a product first.");
      return;
    }
    if (!slug) {
      toast.error("Please provide a slug.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/mock-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          productCode: selectedProduct.productCode,
          productTitle: selectedProduct.title,
          productImage: selectedProduct.image,
          price: selectedProduct.price,
          currency: selectedProduct.currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      toast.success("Mock booking link created successfully!");
      router.push("/dashboard/viator-mock");
    } catch (error: any) {
      toast.error(error.message || "Failed to create mock booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/viator-mock"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
        >
          <FaArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Mock Link</h1>
          <p className="text-sm text-slate-400 mt-1">Generate a custom booking flow for a specific Viator product.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Col: Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">1. Find Product</h2>
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Enter Exact Viator Product Code (e.g. 12345P1)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-medium transition"
            >
              {isSearching ? <FaSpinner className="animate-spin" /> : <FaSearch />}
            </button>
          </form>

          <div className="space-y-3">
            {searchResults.map((product) => (
              <div
                key={product.productCode}
                onClick={() => setSelectedProduct(product)}
                className={`flex gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedProduct?.productCode === product.productCode
                    ? "bg-indigo-500/10 border-indigo-500"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                }`}
              >
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.image} alt="" className="w-16 h-16 rounded-lg object-cover bg-slate-800" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-slate-800" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white line-clamp-2">{product.title}</p>
                  <p className="text-xs text-slate-400 mt-1">Code: {product.productCode}</p>
                </div>
                {selectedProduct?.productCode === product.productCode && (
                  <div className="text-indigo-400 flex items-center justify-center pr-2">
                    <FaCheck className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Configure */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-6">2. Configure Link</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Selected Product</label>
              {selectedProduct ? (
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-sm text-slate-300">
                  <span className="font-bold text-white">{selectedProduct.title}</span> ({selectedProduct.productCode})
                </div>
              ) : (
                <div className="p-3 bg-slate-800/30 rounded-xl border border-slate-700/50 text-sm text-slate-500 italic">
                  No product selected yet.
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-300">Custom URL Slug</label>
                <button
                  type="button"
                  onClick={generateSlug}
                  disabled={!selectedProduct}
                  className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                >
                  Generate from title
                </button>
              </div>
              <div className="flex items-center">
                <div className="shrink-0 px-3 py-3 border border-r-0 border-slate-700 rounded-l-xl bg-slate-800 text-slate-400 text-sm">
                  {typeof window !== "undefined" ? window.location.host : "yoursite.com"}/v/
                </div>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="my-custom-tour"
                  disabled={!selectedProduct}
                  className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-r-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">Only use lowercase letters, numbers, and hyphens.</p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !selectedProduct || !slug}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 rounded-xl text-white font-bold text-sm shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {isSubmitting && <FaSpinner className="animate-spin w-4 h-4" />}
              Save & Generate Link
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
