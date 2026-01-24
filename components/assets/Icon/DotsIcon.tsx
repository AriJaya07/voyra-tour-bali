type DotsIconProps = React.SVGProps<SVGSVGElement> & {
    isActive?: boolean
  }
  
  export default function DotsIcon({
    isActive = false,
    ...props
  }: DotsIconProps) {
    const color = isActive ? "#2563EB" : "#979797"
  
    const DOT_RADIUS = 3
    const GAP = 9
  
    return (
      <svg
        width="42"
        height="35"
        viewBox="0 0 42 35"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
      >
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <circle
              key={`${row}-${col}`}
              cx={6 + col * GAP}
              cy={10 + row * GAP}
              r={DOT_RADIUS}
              fill={color}
            />
          ))
        )}
      </svg>
    )
  }
  