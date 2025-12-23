import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({tsDecorators:true})],
  // Allow YAML files to be imported/fetched
  assetsInclude: ['**/*.yaml', '**/*.yml'],
})
