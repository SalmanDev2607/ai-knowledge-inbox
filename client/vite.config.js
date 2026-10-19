import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The browser talks to /api/*; Vite forwards it to the Express server and strips the prefix.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  error: {
                    code: 'SERVER_UNREACHABLE',
                    message: 'Cannot reach the backend server. Make sure it is running on port 3001 (npm run dev:server).',
                  },
                })
              );
            }
          });
        },
      },
    },
  },
});
