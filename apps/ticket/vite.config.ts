import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { analyzer } from 'vite-bundle-analyzer'

// https://vitejs.dev/config/

export default defineConfig({
  plugins: [react({
    tsDecorators: true,
    plugins: [['@swc/plugin-styled-components', { displayName: true, ssr: false }]],
  })/*, analyzer()*/], // enabled analyzer breaks builds leaving a server running for examining bundles
});
