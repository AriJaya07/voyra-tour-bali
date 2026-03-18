type Props = React.SVGProps<SVGSVGElement> & { isActive?: boolean }

export default function FamilyIcon({ isActive = false, ...props }: Props) {
  const color = isActive ? "#2563EB" : "#979797"

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <circle cx="9" cy="4" r="2" fill={color} />
      <circle cx="15" cy="4" r="2" fill={color} />
      <path d="M5.5 9.5A1.5 1.5 0 0 1 7 8h4a1.5 1.5 0 0 1 1.5 1.5V14h-2v7H7v-7H5.5V9.5Z" fill={color} />
      <path d="M13.5 9.5A1.5 1.5 0 0 1 15 8h2a1.5 1.5 0 0 1 1.5 1.5V14h-1.5v7H15v-7h-1.5V9.5Z" fill={color} />
    </svg>
  )
}
