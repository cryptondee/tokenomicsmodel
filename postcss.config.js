export default {
  plugins: {
    // Use 'tailwindcss' directly, as this is the standard for current versions.
    // The path to tailwind.config.js is usually auto-detected if it's in the project root.
    // Explicitly providing it with `config: './tailwind.config.js'` is also fine if preferred.
    'tailwindcss': { config: './tailwind.config.js' },
    'autoprefixer': {},
  },
}
