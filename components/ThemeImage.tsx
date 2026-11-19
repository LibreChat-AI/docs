import { ImageZoom } from 'fumadocs-ui/components/image-zoom'

/**
 * Renders a screenshot that swaps between a light and dark variant based on the
 * active theme (via the global .image-light-theme / .image-dark-theme rules in
 * app/global.css). Each variant is wrapped in ImageZoom so it supports
 * click-to-zoom, just like markdown images do.
 *
 * Using a plain <img> as ImageZoom children keeps it working for both local and
 * remote sources without needing next/image width/height.
 */
function ZoomableImg({ src, alt, width }: { src: string; alt: string; width?: number }) {
  return (
    <ImageZoom src={src} alt={alt}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="rounded-lg"
        style={width ? { width: '100%', maxWidth: width } : undefined}
      />
    </ImageZoom>
  )
}

/**
 * `width` is the display width in CSS pixels. Pass it for screenshots captured at a 2x device
 * scale so they render at their natural size instead of stretching to the column width.
 */
export function ThemeImage({
  light,
  dark,
  alt,
  width,
}: {
  light: string
  dark: string
  alt: string
  width?: number
}) {
  return (
    <span className="my-4 flex justify-center">
      <span className="image-light-theme">
        <ZoomableImg src={light} alt={alt} width={width} />
      </span>
      <span className="image-dark-theme">
        <ZoomableImg src={dark} alt={alt} width={width} />
      </span>
    </span>
  )
}
