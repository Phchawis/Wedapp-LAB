import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // ส่งต่อ /api ไปยัง backend (Express) ระหว่างพัฒนา
      '/api': 'http://localhost:3001',
    },
  },
});
