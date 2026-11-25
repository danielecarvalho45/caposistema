import { describe, expect, it } from 'vitest'
import { nutritionDownloadFilename } from '../../src/lib/pdf/nutrition-download-filename'

describe('Nome local do PDF nutricional', () => {
  it('usa nome completo e número CAPO do documento, preservando zeros', () => {
    expect(nutritionDownloadFilename({ patient_name: 'Paciente de Teste', patient_number: '000123' }))
      .toBe('PLANO ALIMENTAR - PACIENTE DE TESTE - CAPO 000123.pdf')
  })
  it('mantém acentos e não duplica prefixo CAPO', () => {
    expect(nutritionDownloadFilename({ patient_name: 'João da Silva', patient_number: 'CAPO-000123' }))
      .toBe('PLANO ALIMENTAR - JOÃO DA SILVA - CAPO 000123.pdf')
  })
  it('remove caracteres inválidos de arquivo e não inventa identificação', () => {
    expect(nutritionDownloadFilename({ patient_name: 'Teste/A: B', patient_number: '12\\34' }))
      .toBe('PLANO ALIMENTAR - TESTE A B - CAPO 12 34.pdf')
    expect(nutritionDownloadFilename(null))
      .toBe('PLANO ALIMENTAR - PACIENTE SEM NOME INFORMADO - CAPO NAO INFORMADO.pdf')
  })
})
