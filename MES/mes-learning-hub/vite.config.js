import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for built assets
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-icons')) {
              return 'vendor-icons';
            }
            return 'vendor';
          }
          if (id.includes('PpapLessons')) {
            return 'course-ppap';
          }
          if (id.includes('CustomerAuditLessons')) {
            return 'course-customer-audits';
          }
          if (id.includes('LiveAuditLessons')) {
            return 'course-live-qa';
          }
          if (id.includes('IsoMasteryLessons')) {
            return 'course-iso';
          }
        }
      }
    }
  }
})
