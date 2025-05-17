/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{svelte,js,ts,jsx,tsx}", // Scan all relevant files in src
  ],
  darkMode: 'class', // Enable dark mode based on the 'dark' class on the <html> element
  theme: {
    extend: {},
  },
  plugins: [],
}
