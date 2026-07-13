import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes the built assets use relative paths, so this works
// correctly on GitHub Pages no matter what the repo/subpath is named.
export default defineConfig({
  plugins: [react()],
  base: './',
})
