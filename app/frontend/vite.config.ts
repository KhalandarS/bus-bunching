import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Builds into ../static/dist, which server.py serves directly, so the whole
// app is one FastAPI process in prod. The dev proxy forwards /route and /ws
// to the FastAPI backend so `npm run dev` works against the live sim without
// a second CORS/websocket-origin setup.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: '../static/dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/route': 'http://127.0.0.1:8000',
      '/ws': { target: 'ws://127.0.0.1:8000', ws: true },
    },
  },
})
