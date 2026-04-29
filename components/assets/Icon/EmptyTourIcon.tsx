export default function EmptyTourIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <circle cx="48" cy="48" r="34" className="opacity-25" />
      <path
        d="M48 22v52M22 48h52"
        className="opacity-20"
        strokeWidth={1.5}
      />
      <path d="M48 30l8 18-8 18-8-18z" fill="currentColor" fillOpacity="0.15" />
      <path d="M48 30l8 18-8 18-8-18z" />
      <circle cx="48" cy="48" r="3" fill="currentColor" />
    </svg>
  );
}
