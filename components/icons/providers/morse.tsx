import React from 'react'

export default function MorseIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-12 -12 24 24"
      className={className}
      {...props}
    >
      <path fill="currentColor" d="M-0.8 -12C-0.8 -7 -5.8 -2 -10.8 -2C-5.8 -2 -0.8 3 -0.8 8Z" />
      <path fill="currentColor" d="M0.8 -8C0.8 -3 5.8 2 10.8 2C5.8 2 0.8 7 0.8 12Z" />
    </svg>
  )
}
