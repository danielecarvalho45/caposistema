import { describe, expect, it } from 'vitest'
import { isSafeCapoAutoReload } from '../../src/components/system/CapoAutomaticVersionUpdate'

const idleHome = {
  path: '/',
  visible: true,
  online: true,
  idleMs: 130_000,
  edited: false,
  activeEditor: false,
  blockingOverlay: false,
}
describe('atualização automática segura do CAPO', () => {
  it('só permite recarga na Home visível, ociosa e sem formulário pendente', () => {
    expect(isSafeCapoAutoReload(idleHome)).toBe(true)
  })
  it('não recarrega consultas nem telas assistenciais em execução', () => {
    for (const path of ['/agenda', '/atuacao', '/solicitacoes', '/nutricao', '/assistencia-social', '/tecnica', '/confirmar-consulta']) {
      expect(isSafeCapoAutoReload({ ...idleHome, path })).toBe(false)
    }
  })
  it('protege edição, seleção de campo, diálogo e atividade recente', () => {
    expect(isSafeCapoAutoReload({ ...idleHome, edited: true })).toBe(false)
    expect(isSafeCapoAutoReload({ ...idleHome, activeEditor: true })).toBe(false)
    expect(isSafeCapoAutoReload({ ...idleHome, blockingOverlay: true })).toBe(false)
    expect(isSafeCapoAutoReload({ ...idleHome, idleMs: 10_000 })).toBe(false)
    expect(isSafeCapoAutoReload({ ...idleHome, visible: false })).toBe(false)
    expect(isSafeCapoAutoReload({ ...idleHome, online: false })).toBe(false)
  })
})
