import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/glitch-in-the-script/', // 👈 MUST match your exact repo name with slashes
})