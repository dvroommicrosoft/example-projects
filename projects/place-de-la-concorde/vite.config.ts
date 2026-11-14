import { defineConfig } from 'vite'

const allowedHosts = process.env.PREVIEW_HOST ? [process.env.PREVIEW_HOST] : []

export default defineConfig({
  base: '/example-projects/place-de-la-concorde/',
  server: { host: '0.0.0.0', allowedHosts },
  preview: { host: '0.0.0.0', allowedHosts },
})
