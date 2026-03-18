type Props = React.SVGProps<SVGSVGElement> & { isActive?: boolean }

export default function AdventureIcon({ isActive = false, ...props }: Props) {
  const color = isActive ? "#2563EB" : "#979797"

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M14 6l-4.22 6.33L8.56 10.6 3 20h18L14 6ZM5 18l3.56-5.34 1.78 2.67L14 9.33 19 18H5Z" fill={color} />
    </svg>
  )
}
