import React from 'react'

export default function InferIcon({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="284 251 720 720"
      className={className}
      {...props}
    >
      <path
        fill="currentColor"
        d="M393 704 455 538H531L548 446C568 346 656 270 755 270H889L840 424H781C746 424 722 444 715 477L707 538H895Z"
      />
      <path fill="currentColor" d="m496 714 199-75-77 313H436Z" />
    </svg>
  )
}
