type Props = React.SVGProps<SVGSVGElement> & { isActive?: boolean }

export default function DayTripsIcon({ isActive = false, ...props }: Props) {
  const color = isActive ? "#2563EB" : "#979797"

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm1-13h-2v6l5.25 3.15.75-1.23-4-2.42V7Z" fill={color} />
    </svg>
  )
}
