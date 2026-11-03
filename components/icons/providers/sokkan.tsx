import React from 'react'

// Monochrome version of the SOKKAN mark (https://sokkan.ch/brand/sokkan-icon.svg)
export default function SokkanIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 320"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <g strokeWidth="13">
          <line x1="254" y1="160" x2="284" y2="160" />
          <line x1="226.5" y1="93.5" x2="247.7" y2="72.3" />
          <line x1="160" y1="66" x2="160" y2="36" />
          <line x1="93.5" y1="93.5" x2="72.3" y2="72.3" />
          <line x1="66" y1="160" x2="36" y2="160" />
          <line x1="93.5" y1="226.5" x2="72.3" y2="247.7" />
          <line x1="160" y1="254" x2="160" y2="284" />
          <line x1="226.5" y1="226.5" x2="247.7" y2="247.7" />
          <circle cx="160" cy="160" r="96" />
        </g>
        <g strokeWidth="14">
          <line x1="150.5" y1="85.1" x2="150.5" y2="234.9" />
          <polyline points="108.5,118 149.5,160 108.5,202" />
          <line x1="169.5" y1="85.1" x2="169.5" y2="234.9" />
          <polyline points="211.5,118 170.5,160 211.5,202" />
        </g>
      </g>
      <circle cx="160" cy="160" r="17" fill="currentColor" />
    </svg>
  )
}
