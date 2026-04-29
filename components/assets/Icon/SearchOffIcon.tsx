export default function SearchOffIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <circle
        cx="42"
        cy="42"
        r="22"
        fill="currentColor"
        fillOpacity="0.08"
      />
      <circle cx="42" cy="42" r="22" />
      <path d="M58 58l16 16" />
      <path d="M34 34l16 16M50 34L34 50" strokeWidth={2.2} />
    </svg>
  );
}
