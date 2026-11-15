import React from 'react'

export default function LinkrraIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
        <line x1="12" y1="11" x2="5" y2="7" />
        <line x1="12" y1="11" x2="12" y2="4" />
        <line x1="12" y1="11" x2="19" y2="8" />
        <line x1="12" y1="11" x2="8" y2="18" />
        <line x1="12" y1="11" x2="17" y2="17" />
      </g>
      <g fill="currentColor">
        <circle cx="5" cy="7" r="1.4" />
        <circle cx="12" cy="4" r="1.4" />
        <circle cx="19" cy="8" r="1.4" />
        <circle cx="8" cy="18" r="1.4" />
        <circle cx="17" cy="17" r="1.4" />
        <circle cx="12" cy="11" r="2.1" />
      </g>
    </svg>
  )
}
