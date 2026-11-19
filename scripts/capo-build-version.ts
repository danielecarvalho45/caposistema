import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

// Apenas entradas que compõem o frontend publicado. Auditorias, testes,
// migrations e documentos não alteram o identificador de atualização do navegador.
const BUILD_DIRECTORIES = ['src', 'public', 'scripts'] as const
const BUILD_FILES = [
  'index.html',
  'package.json',
  'package-lock.json',
  'vite.config.ts',
] as const

export function createCapoSourceVersion(root = process.cwd()): string {
  const hash = createHash('sha256')
  const files: string[] = [...BUILD_FILES]

  function collect(directory: string) {
    const absolute = join(root, directory)
    if (!existsSync(absolute)) return
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const name = join(directory, entry.name)
      if (entry.isDirectory()) collect(name)
      else if (entry.isFile()) files.push(name)
    }
  }

  BUILD_DIRECTORIES.forEach(collect)

  for (const name of files.sort()) {
    const absolute = join(root, name)
    if (!existsSync(absolute)) continue
    hash.update(relative(root, absolute).replaceAll('\\', '/'))
    hash.update('\0')
    hash.update(readFileSync(absolute))
    hash.update('\0')
  }
  // 24 dígitos hexadecimais, estáveis para o mesmo conteúdo.
  return hash.digest('hex').slice(0, 24)
}
