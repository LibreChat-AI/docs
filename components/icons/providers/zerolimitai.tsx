import React from 'react'

// Monochrome mark from https://www.zerolimitai.com (the "Z" route between two nodes)
export default function ZeroLimitAIIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        d="M5 5.5H19L5 18.5H19"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="5.5" r="3" fill="currentColor" />
      <circle cx="19" cy="18.5" r="3" fill="currentColor" />
    </svg>
  )
}
