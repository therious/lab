import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom', 'styled-components'],
  },
  plugins: [react({
    plugins: [['@swc/plugin-styled-components', { displayName: true, ssr: false }]],
  })],
  server: { port: 5175 },
});
