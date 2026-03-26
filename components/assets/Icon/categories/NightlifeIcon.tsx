type Props = React.SVGProps<SVGSVGElement> & { isActive?: boolean }

export default function NightlifeIcon({ isActive = false, ...props }: Props) {
  const color = isActive ? "#2563EB" : "#979797"

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.1 2.9a9 9 0 0 0 0 18.2 9 9 0 0 0 6.3-2.6A7.2 7.2 0 0 1 12 12a7.2 7.2 0 0 1 6.4-6.5A9 9 0 0 0 12.1 2.9Z" fill={color} />
    </svg>
  )
}
