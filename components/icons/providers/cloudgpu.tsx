import React from 'react'

export default function CloudGPUIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...props}>
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M6 10.6 11.7 9.9 18 7.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="6" y="13.6" width="12" height="1.8" rx="0.9" fill="currentColor" />
      <rect x="6" y="16.8" width="12" height="1.8" rx="0.9" fill="currentColor" opacity="0.6" />
    </svg>
  )
}
