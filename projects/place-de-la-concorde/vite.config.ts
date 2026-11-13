import { defineConfig } from 'vite'

export default defineConfig({
  base: '/example-projects/place-de-la-concorde/',
  build: { chunkSizeWarningLimit: 900 },
})
