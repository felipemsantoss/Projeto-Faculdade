import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const API_PORT = process.env.API_PORT ?? '3333';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    // O front chama /api/... na própria origem e o Vite encaminha para a API.
    // Sem CORS no navegador, e as requisições aparecem normalmente no Network.
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
});
