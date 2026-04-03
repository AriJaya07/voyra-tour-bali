import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllDestinations, getDestinationDetail, getImageUrl } from '@/lib/newsApi';
import BlogCard from '@/components/Blog/BlogCard';
import { HiOutlineCalendarDays, HiOutlineMapPin, HiOutlineChevronLeft } from "react-icons/hi2";
import PromotionApp from '@/components/Homepage/PromotionApp';

interface PageProps {
  params: Promise<{ id: string }>;
}

// Map dynamic metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const p = await params;
  const destination = await getDestinationDetail(p.id);

  if (!destination) {
    return {
      title: 'Article Not Found | Bali Travel Now',
    };
  }

  return {
    title: `${destination.title} | Bali Travel Now`,
    description: destination.description,
    openGraph: {
      images: [getImageUrl(destination.image)],
    },
  };
}

export const revalidate = 60; // ISR Support

export default async function BlogDetailPage({ params }: PageProps) {
  const p = await params;
  const [destination, allDestinations] = await Promise.all([
    getDestinationDetail(p.id),
    getAllDestinations(),
  ]);

  if (!destination) {
    notFound();
  }

  // Find related posts (same category, exclude current)
  const relatedPosts = allDestinations
    .filter(d => d.categoryId === destination.categoryId && String(d.id) !== p.id)
    .slice(0, 3); // top 3

  return (
    <main className="min-h-screen bg-white pb-20">
      {/* Banner / Hero */}
      <div className="relative h-[60vh] min-h-[400px] w-full bg-slate-900">
        <Image
          src={getImageUrl(destination.image)}
          alt={destination.title}
          fill
          className="object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>
        
        <div className="absolute inset-0 flex items-end pb-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <Link href="/blog" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors">
              <HiOutlineChevronLeft className="w-5 h-5 mr-1" />
              Back to Blog
            </Link>
            
            {destination.categoryName && (
              <div className="mb-4 inline-block bg-amber-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
                {destination.categoryName}
              </div>
            )}
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight drop-shadow-md">
              {destination.title}
            </h1>
            
            <div className="flex flex-wrap items-center text-white/90 gap-6 text-sm font-medium">
              {destination.createdAt && (
                <div className="flex items-center">
                  <HiOutlineCalendarDays className="w-5 h-5 mr-2" />
                  {new Date(destination.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              )}
              {destination.location && (
                <div className="flex items-center">
                  <HiOutlineMapPin className="w-5 h-5 mr-2" />
                  {typeof destination.location === 'string' ? destination.location : destination.location.title || destination.location.address}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 max-w-4xl pt-16">
        <div className="text-xl text-gray-600 mb-10 font-medium leading-relaxed border-l-4 border-amber-500 pl-6 py-2">
          {destination.description}
        </div>
        
        <article 
          className="prose prose-lg max-w-none prose-img:rounded-2xl prose-img:shadow-md prose-headings:font-bold prose-a:text-amber-500 hover:prose-a:text-amber-600 prose-blockquote:border-l-amber-500"
          dangerouslySetInnerHTML={{ __html: destination.content || "" }}
        />
        
        {/* Internal Link to other categories context */}
        <div className="mt-16 py-6 border-t border-b border-gray-100 flex justify-between items-center">
          <span className="text-gray-500 ">Share this article</span>
          <Link href="/blog" className="text-amber-500 font-semibold hover:underline">
            Explore more in {destination.categoryName || 'our blog'}
          </Link>
        </div>
      </div>

      <PromotionApp />

      {/* Related Posts for Internal Linking / SEO */}
      {relatedPosts.length > 0 && (
        <div className="container mx-auto px-4 max-w-6xl pb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Related Articles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {relatedPosts.map(post => (
              <BlogCard key={post.id} blog={post} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
