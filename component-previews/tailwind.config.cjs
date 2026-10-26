const libreChatTailwindPreset = require('@librechat/client/tailwind-preset')

/** The consumer setup from the package's theme README: the preset, the package's built
 *  files as content, and class-based dark mode. */
module.exports = {
  presets: [libreChatTailwindPreset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './node_modules/@librechat/client/dist/**/*.{js,mjs,cjs}',
  ],
  darkMode: ['class'],
}
