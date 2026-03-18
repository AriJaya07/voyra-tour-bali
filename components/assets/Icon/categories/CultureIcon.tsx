type Props = React.SVGProps<SVGSVGElement> & { isActive?: boolean }

export default function CultureIcon({ isActive = false, ...props }: Props) {
  const color = isActive ? "#2563EB" : "#979797"

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12 2L2 7h2v9H2l10 5 10-5h-2V7h2L12 2Zm-4 5.5h2V16H8V7.5Zm3 0h2V16h-2V7.5Zm3 0h2V16h-2V7.5Z" fill={color} />
    </svg>
  )
}
