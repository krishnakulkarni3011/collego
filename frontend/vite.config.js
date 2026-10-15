import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // ─── Dev server ────────────────────────────────────────────────────────────
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      // In dev, proxy /api/* to local backend
      '/api': {
        target: 'http://localhost:9090',
        changeOrigin: true,
      },
    },
  },

  // ─── Production build ──────────────────────────────────────────────────────
  build: {
    // Raise warning threshold so we don't get noise from vendor bundles
    chunkSizeWarningLimit: 1500,

    rollupOptions: {
      output: {
        // Manual code splitting — separate vendor libs from app code
        // Vite 8 (rolldown) requires manualChunks as a function
        manualChunks(id) {
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion'
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) return 'vendor-charts'
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons'
          if (id.includes('node_modules/@radix-ui')) return 'vendor-radix'
          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react'
          if (id.includes('node_modules/axios') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge') || id.includes('node_modules/class-variance-authority')) return 'vendor-utils'
        },
      },
    },
  },
})
