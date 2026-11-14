import { defineConfig } from 'vite'

export default defineConfig({
  base: '/example-projects/place-de-la-concorde-opus/',
  build: { chunkSizeWarningLimit: 900 },
})
