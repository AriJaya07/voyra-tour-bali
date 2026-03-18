type Props = React.SVGProps<SVGSVGElement> & { isActive?: boolean }

export default function NatureIcon({ isActive = false, ...props }: Props) {
  const color = isActive ? "#2563EB" : "#979797"

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M14 6l-3.75 5h2.25L8 17h3v4h2v-4h3l-4.5-6h2.25L14 6Z" fill={color} />
      <path d="M6 3v2c0 3.07 2.18 5.64 5.08 6.24L10 13h4l-1.08-1.76A7.01 7.01 0 0 0 18 5V3H6Z" fill={color} opacity="0.3" />
    </svg>
  )
}
