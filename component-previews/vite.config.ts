import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

/**
 * Builds the component previews the docs embed in iframes. They live outside the docs
 * build on purpose: `@librechat/client` brings its own Tailwind theme (`@theme inline`
 * remaps the radius, shadow and font utilities) and its own peer dependency versions,
 * and neither should reach the docs site.
 */
export default defineConfig({
  base: '/component-previews/',
  plugins: [react(), tailwindcss()],
  resolve: {
    /** `librechat-data-provider`, a peer of the package, imports two Node built-ins at its top
     *  level. The previews never reach the code that uses them, so browser globals stand in. */
    alias: {
      url: fileURLToPath(new URL('./src/shims/url.ts', import.meta.url)),
      crypto: fileURLToPath(new URL('./src/shims/crypto.ts', import.meta.url)),
    },
  },
  build: {
    outDir: '../public/component-previews',
    emptyOutDir: true,
  },
})
