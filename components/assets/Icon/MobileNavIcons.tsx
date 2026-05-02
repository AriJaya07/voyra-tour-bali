type IconProps = React.SVGProps<SVGSVGElement> & { active?: boolean };

const baseProps = {
  viewBox: "0 0 24 24",
  className: "w-6 h-6",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function MobileHomeIcon({ active, ...props }: IconProps) {
  return (
    <svg {...baseProps} fill={active ? "currentColor" : "none"} {...props}>
      <path d="M3 9.5l9-7 9 7V20a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2V9.5z" />
    </svg>
  );
}

export function MobileSearchIcon(props: IconProps) {
  return (
    <svg {...baseProps} fill="none" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function MobileHeartIcon({ active, ...props }: IconProps) {
  return (
    <svg {...baseProps} fill={active ? "currentColor" : "none"} {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function MobileTripsIcon({ active, ...props }: IconProps) {
  return (
    <svg {...baseProps} fill={active ? "currentColor" : "none"} {...props}>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function MobilePersonIcon({ active, ...props }: IconProps) {
  return (
    <svg {...baseProps} fill={active ? "currentColor" : "none"} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
