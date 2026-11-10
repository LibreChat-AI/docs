import React from 'react'

export default function EngyIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      className={className}
      {...props}
    >
      <rect x="205" y="246" width="472" height="132" rx="66" fill="currentColor" />
      <rect x="347" y="444" width="472" height="134" rx="67" fill="currentColor" />
      <rect x="205" y="647" width="472" height="132" rx="66" fill="currentColor" />
    </svg>
  )
}
