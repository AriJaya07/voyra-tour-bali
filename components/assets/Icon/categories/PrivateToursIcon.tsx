type Props = React.SVGProps<SVGSVGElement> & { isActive?: boolean }

export default function PrivateToursIcon({ isActive = false, ...props }: Props) {
  const color = isActive ? "#2563EB" : "#979797"

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 1l3 6.5L22 8l-5 4.9L18.2 20 12 16.5 5.8 20 7 12.9 2 8l7-0.5L12 1Z" fill={color} />
    </svg>
  )
}
