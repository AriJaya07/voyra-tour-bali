import Link from "next/link";

interface Props {
  region: string | null;
  title: string;
}

export default function Breadcrumbs({ region, title }: Props) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-blue-100/80">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-white transition">
            Home
          </Link>
        </li>
        <li aria-hidden>›</li>
        <li>
          <Link href="/guides" className="hover:text-white transition">
            Guides
          </Link>
        </li>
        {region && (
          <>
            <li aria-hidden>›</li>
            <li>
              <Link
                href={`/guides?region=${encodeURIComponent(region)}`}
                className="hover:text-white transition"
              >
                {region}
              </Link>
            </li>
          </>
        )}
        <li aria-hidden>›</li>
        <li className="text-white/95 line-clamp-1 max-w-[60ch]">{title}</li>
      </ol>
    </nav>
  );
}
