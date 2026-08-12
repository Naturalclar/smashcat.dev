import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// ルートドメイン直下で配信するため base は既定 ('/') のまま。
// /medley-generator/ は worker/index.ts が GitHub Pages にプロキシするので、
// このビルドには含まれない。
export default defineConfig({
  plugins: [react()],
})
