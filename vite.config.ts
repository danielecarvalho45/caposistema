import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { createCapoSourceVersion } from './scripts/capo-build-version'

// Mesmo identificador determinístico no JavaScript e no manifesto.
// Alterações apenas em auditorias, migrations e documentos não geram aviso.
const capoBuildVersion = createCapoSourceVersion()

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
