type Props = React.SVGProps<SVGSVGElement> & { isActive?: boolean }

export default function WellnessIcon({ isActive = false, ...props }: Props) {
  const color = isActive ? "#2563EB" : "#979797"

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 22c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2Zm0-18C8.27 4 5 6.05 5 9.5c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-1.76c1.81-1.27 3-3.36 3-5.74C19 6.05 15.73 4 12 4Zm2.85 9.1-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 0 1 7 9.5C7 7.08 9.24 5.5 12 5.5s5 1.58 5 4c0 1.62-.88 3.14-2.15 3.6Z" fill={color} />
    </svg>
  )
}
