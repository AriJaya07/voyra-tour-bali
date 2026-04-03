import { Metadata } from 'next';
import { getAllDestinations, getCategories, getHomeHighlights } from '@/lib/newsApi';
import BlogCard from '@/components/Blog/BlogCard';
import CategoryFilter from '@/components/Blog/CategoryFilter';
import SectionHeader from '@/components/Blog/SectionHeader';
import ErrorState from '@/components/Blog/ErrorState';

export const metadata: Metadata = {
  title: 'Blog & Travel Guide | Bali Travel Now',
  description: 'Discover the beauty of Bali through our curated travel guides, tips, and articles about destinations in Bali.',
};

export const revalidate = 60; // ISR Support

export default async function BlogPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams;
  const categoryId = searchParams?.categoryId as string | undefined;

  // Parallel fetch for optimal performance
  const [destinations, categories, highlights] = await Promise.all([
    getAllDestinations(),
    getCategories(),
    getHomeHighlights(),
  ]);

  if (!destinations || !categories) {
    return (
      <div className="container mx-auto px-4 py-16">
        <ErrorState />
      </div>
    );
  }

  // Filter based on category if provided
  const filteredDestinations = categoryId 
    ? destinations.filter(d => String(d.categoryId) === categoryId)
    : destinations;

  const featuredBlog = highlights && highlights.length > 0 ? highlights[0] : null;

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Search & Header (Optional decoration) */}
      <div className="bg-white border-b border-gray-100 pt-20 pb-16">
        <div className="container mx-auto px-4">
          <SectionHeader 
            title="Discover Bali" 
            subtitle="Expert insights, travel guides, and inspiring destinations for your next adventure in the Island of the Gods."
            centered
          />
        </div>
      </div>

      <div className="container mx-auto px-4 pt-10">
        
        {/* Category Filter */}
        <div className="mb-12 sticky top-[65px] z-20 bg-gray-50/80 backdrop-blur-md py-4">
          <CategoryFilter categories={categories} />
        </div>

        {/* Featured / Hero Highlight */}
        {!categoryId && featuredBlog && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 lg:mb-8">Featured Article</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-gray-100 ">
              <div className="relative h-72 md:h-96 w-full rounded-2xl overflow-hidden shadow-md">
                {/*  using raw img or Next Image. Let's use getImageUrl from api */}
                <img 
                  src={require("@/lib/newsApi").getImageUrl(featuredBlog.image)} 
                  alt={featuredBlog.title}
                  className="w-full h-full object-cover rounded-2xl hover:scale-105 transition-transform duration-700" 
                />
              </div>
              <div className="flex flex-col">
                <div className="text-sm font-bold text-amber-500 mb-3 uppercase tracking-wider">Highlight</div>
                <h3 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4 line-clamp-2">
                  {featuredBlog.title}
                </h3>
                <p className="text-gray-600 text-lg mb-8 line-clamp-3">
                  {featuredBlog.description}
                </p>
                <div>
                  <a href={`/blog/${featuredBlog.id}`} className="inline-flex items-center justify-center px-8 py-3.5 text-base font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-full shadow-lg shadow-amber-500/30 transition-all duration-300 transform hover:-translate-y-1">
                    Read the Guide
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blog Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-gray-900 lg:mb-8">
            {categoryId 
             ? `Insights: ${categories.find(c => String(c.id) === categoryId)?.displayCat || 'Filtered'}` 
             : "Latest Articles"}
          </h2>
          
          {filteredDestinations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
              {filteredDestinations.map(blog => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 ">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5L18.5 7H20" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Articles Found</h3>
              <p className="text-gray-500 max-w-md mx-auto">We couldn't found any articles in this category. Check back later for more updates.</p>
            </div>
          )}
        </div>
        
      </div>
    </main>
  );
}
