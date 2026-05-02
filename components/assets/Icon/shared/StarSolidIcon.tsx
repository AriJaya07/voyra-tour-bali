type IconProps = React.SVGProps<SVGSVGElement>;

export default function StarSolidIcon({ className = "w-2.5 h-2.5 fill-current", ...props }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden {...props}>
      <path d="M8 0L9.8 5.5H16l-5.1 3.7L12.7 16 8 12.3 3.3 16l1.8-6.8L0 5.5h6.2z" />
    </svg>
  );
}
