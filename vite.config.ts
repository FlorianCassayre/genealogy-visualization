import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // https://mui.com/joy-ui/guides/using-icon-libraries/
      '@mui/material': '@mui/joy',
    },
  },
  define: {
    BUILD_TIMESTAMP: new Date().getTime(),
  }
})
