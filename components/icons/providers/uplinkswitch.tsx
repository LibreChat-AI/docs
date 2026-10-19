import React from 'react'

// Monochrome version of the mark at https://uplinkswitch.com/brand: four ports and the lit uplink port
export default function UplinkSwitchIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.45">
        <rect x="0.25" y="10.25" width="3.5" height="3.5" rx="0.33" />
        <rect x="5.25" y="10.25" width="3.5" height="3.5" rx="0.33" />
        <rect x="10.25" y="10.25" width="3.5" height="3.5" rx="0.33" />
        <rect x="15.25" y="10.25" width="3.5" height="3.5" rx="0.33" />
      </g>
      <rect x="20" y="10" width="4" height="4" rx="0.57" fill="currentColor" />
    </svg>
  )
}
