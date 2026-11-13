import { defineConfig } from 'vite'

export default defineConfig({
  base: '/example-projects/concorde-threejs/',
  build: { chunkSizeWarningLimit: 900 },
})
