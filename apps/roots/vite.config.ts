import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    tsDecorators: true,
    plugins: [['@swc/plugin-styled-components', { displayName: true, ssr: false }]],
  })],
  // Allow YAML files to be imported/fetched
  assetsInclude: ['**/*.yaml', '**/*.yml'],
  worker: {
    format: 'es',
  },
  server: {
    port: 5174,
  },
})
