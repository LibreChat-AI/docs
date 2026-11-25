import React from 'react'

export default function ProxyStacksIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className} {...props}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.5 2h11A4.5 4.5 0 0 1 22 6.5v11a4.5 4.5 0 0 1-4.5 4.5h-11A4.5 4.5 0 0 1 2 17.5v-11A4.5 4.5 0 0 1 6.5 2ZM8 6.5h5.2a3.25 3.25 0 0 1 1.37 6.2L17 17.5h-2.5L12.35 13H10.2v4.5H8V6.5Zm2.2 2v2.5h2.9a1.25 1.25 0 0 0 0-2.5h-2.9Z"
      />
    </svg>
  )
}
