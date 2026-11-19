import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createCapoSourceVersion } from '../../scripts/capo-build-version'

const directories: string[] = []

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'capo-version-test-'))
  directories.push(root)
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, 'scripts'), { recursive: true })
  writeFileSync(join(root, 'src', 'main.tsx'), 'export const app = true')
  writeFileSync(join(root, 'vite.config.ts'), 'export default {}')
  writeFileSync(join(root, 'scripts', 'capo-build-version.ts'), 'version logic')
  return root
}

afterEach(() => {
  for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('identificador de atualização funcional do CAPO', () => {
  it('permanece estável entre compilações sem mudança funcional', () => {
    const root = fixture()
    expect(createCapoSourceVersion(root)).toBe(createCapoSourceVersion(root))
    expect(createCapoSourceVersion(root)).toMatch(/^[a-f0-9]{24}$/)
  })

  it('ignora auditorias, manuais, migrations e testes', () => {
    const root = fixture()
    const original = createCapoSourceVersion(root)
    writeFileSync(join(root, 'CAPO_AUDITORIA_FINAL_DE_IMPLANTACAO_2026-09-25.md'), 'auditoria atualizada')
    mkdirSync(join(root, 'supabase', 'migrations'), { recursive: true })
    writeFileSync(join(root, 'supabase', 'migrations', 'maintenance.sql'), 'select 1;')
    mkdirSync(join(root, 'tests'), { recursive: true })
    writeFileSync(join(root, 'tests', 'audit.test.ts'), 'test case')
    expect(createCapoSourceVersion(root)).toBe(original)
  })

  it('muda apenas quando arquivos usados pela aplicação mudam', () => {
    const root = fixture()
    const original = createCapoSourceVersion(root)
    writeFileSync(join(root, 'src', 'main.tsx'), 'export const app = false')
    expect(createCapoSourceVersion(root)).not.toBe(original)
  })

  it('detecta alteração dos estilos, recursos públicos e configuração', () => {
    const root = fixture()
    const original = createCapoSourceVersion(root)
    writeFileSync(join(root, 'src', 'app.css'), 'body { color: black }')
    const styled = createCapoSourceVersion(root)
    expect(styled).not.toBe(original)
    mkdirSync(join(root, 'public'), { recursive: true })
    writeFileSync(join(root, 'public', 'logo.svg'), '<svg/>')
    expect(createCapoSourceVersion(root)).not.toBe(styled)
  })
})
