import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath } from 'node:url'

// https://vitejs.dev/config/

export default defineConfig({
  // Load .env.local from the monorepo root so all apps can share one file
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  plugins: [react({
    tsDecorators: true,
    plugins: [['@swc/plugin-styled-components', { displayName: true, ssr: false }]],
  })],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom', 'styled-components', 'firebase'],
  },
})
