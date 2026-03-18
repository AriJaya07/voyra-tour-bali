type Props = React.SVGProps<SVGSVGElement> & { isActive?: boolean }

export default function BeachIcon({ isActive = false, ...props }: Props) {
  const color = isActive ? "#2563EB" : "#979797"

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M13.13 14.56l1.43-2.12a7.95 7.95 0 0 0-4.81-1.28l3.38 3.4ZM13.5 8c.88 0 1.73.09 2.55.26.34-.93.52-1.94.52-2.98C16.56 3.53 15.33 2 13.5 2S10.44 3.53 10.44 5.28c0 1.04.18 2.05.52 2.98.82-.17 1.67-.26 2.55-.26ZM7.45 12.08a7.95 7.95 0 0 0-1.83 3.78l3.43-1.6-1.6-2.18ZM2 19.5C2 20.88 3.12 22 4.5 22h15c1.38 0 2.5-1.12 2.5-2.5S20.88 17 19.5 17H4.5C3.12 17 2 18.12 2 19.5Z" fill={color} />
    </svg>
  )
}
