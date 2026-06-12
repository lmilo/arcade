import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo el front habla con el backend vía /api (sin CORS).
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
