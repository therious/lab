import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react({
    tsDecorators: true,
    plugins: [['@swc/plugin-styled-components', { displayName: true, ssr: false }]],
  })],
  server: { port: 5176 },
});
