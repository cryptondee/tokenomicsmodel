import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'; // Import the path module

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      // Setup $lib alias to point to src/lib
      '$lib': path.resolve(__dirname, './src/lib')
    }
  }
})
