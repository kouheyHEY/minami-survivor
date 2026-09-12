import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/synote/',
  plugins: [react()],
  server: {
    port: 4174,
  },
})
