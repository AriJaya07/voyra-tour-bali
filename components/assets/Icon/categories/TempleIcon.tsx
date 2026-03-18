type Props = React.SVGProps<SVGSVGElement> & { isActive?: boolean }

export default function TempleIcon({ isActive = false, ...props }: Props) {
  const color = isActive ? "#2563EB" : "#979797"

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 2L6 8v2h2v4H6v2h2v4H6v2h12v-2h-2v-4h2v-2h-2v-4h2V8l-6-6Zm-2 18H8v-4h2v4Zm0-6H8v-4h2v4Zm4 6h-2v-4h2v4Zm0-6h-2v-4h2v4Zm2 0v-4h2v4h-2Z" fill={color} />
    </svg>
  )
}
