import React from 'react'

export default function OptiQIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className={className} {...props}>
      <circle cx="32" cy="30" r="15" fill="none" stroke="currentColor" strokeWidth="7" />
      <rect x="35" y="36" width="7" height="17" rx="3.5" fill="currentColor" transform="rotate(-38 38.5 44.5)" />
    </svg>
  )
}
