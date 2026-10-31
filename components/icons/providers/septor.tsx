import React from 'react'

export default function SeptorIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
        d="M17.6 6.6 9.4 17.4h5.1l-1.3 8L22.6 14h-5.2z"
      />
    </svg>
  )
}
