import React from 'react'

export default function PhaseRouterIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      {...props}
    >
      <circle cx="32" cy="32" r="17" stroke="currentColor" strokeWidth="3" opacity=".45" />
      <circle cx="32" cy="32" r="9" fill="currentColor" />
    </svg>
  )
}
