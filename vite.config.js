import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/recharts/')) return 'charts'
          if (id.includes('/node_modules/three-stdlib/') || id.includes('/node_modules/@react-three/')) return 'three-ui'
          if (id.includes('/node_modules/three/')) return 'three-core'
          if (id.includes('/node_modules/gsap/')) return 'gsap'
          if (id.includes('/node_modules/lenis/')) return 'lenis'
          if (id.includes('/node_modules/framer-motion/') || id.includes('/node_modules/motion/')) return 'motion'
          return undefined
        },
      },
    },
  },
})
