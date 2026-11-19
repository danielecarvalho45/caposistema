import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Mesmo identificador embutido no JavaScript e publicado como manifesto.
// O navegador consulta o manifesto sem cache para detectar novas publicações.
const capoBuildVersion = `${Date.now()}`

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'capo-build-version-manifest',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'capo-version.json',
          source: JSON.stringify({ version: capoBuildVersion }),
        })
      },
    },
  ],
  define: {
    __CAPO_BUILD_VERSION__: JSON.stringify(capoBuildVersion),
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
})
