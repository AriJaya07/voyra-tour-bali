export default function SadCloudIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="w-20 h-20"
      fill="none"
      viewBox="0 0 96 96"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.2}
      {...props}
    >
      <path
        d="M28 56a14 14 0 010-28 18 18 0 0134-6 12 12 0 016 22H30"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <path d="M28 56a14 14 0 010-28 18 18 0 0134-6 12 12 0 016 22H30" />
      <circle cx="40" cy="48" r="2" fill="currentColor" />
      <circle cx="56" cy="48" r="2" fill="currentColor" />
      <path d="M40 64c2-3 5-4 8-4s6 1 8 4" />
    </svg>
  );
}
