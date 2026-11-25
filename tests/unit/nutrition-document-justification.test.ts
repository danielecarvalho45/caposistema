import { describe, expect, it } from 'vitest'
import { buildNutritionDocumentPdf, layoutNutritionParagraph } from '../../src/lib/pdf/nutrition-document-pdf'

const document = {
  author_name: 'Nutricionista responsável',
  author_registration: 'CRN 1916',
  patient_name: 'Paciente autorizado',
  patient_number: 'CAPO-123',
  cms: 'CMS-456',
  revision_no: 2,
  created_at: '2026-11-19T15:00:00Z',
  plan_snapshot: {
    document_title: 'PLANO ALIMENTAR ORAL',
    breakfast: 'Mamão e leite.',
    oncology_guidance: 'O paciente deve seguir as orientações individualizadas indicadas durante o acompanhamento. A escolha dos alimentos depende do cuidado realizado em cada atendimento e de suas necessidades atuais.',
  },
}

describe('PDF documental da Nutrição — justificação e limpeza', () => {
  it('distribui as palavras entre as margens em linhas intermediárias', () => {
    const text = 'Durante o acompanhamento nutricional cada pessoa recebe orientações personalizadas e precisa registrar as informações relevantes para manter a continuidade do cuidado sem perder nenhuma parte das recomendações fornecidas.'
    const lines = layoutNutritionParagraph(text, 240, 11.25)
    expect(lines.length).toBeGreaterThan(2)
    expect(lines.some(line => line.justified && line.wordSpacing > 0)).toBe(true)
    expect(lines[lines.length - 1].justified).toBe(false)
    expect(lines[lines.length - 1].wordSpacing).toBe(0)
  })

  it('respeita as quebras de parágrafo digitadas e não justifica linha final', () => {
    const lines = layoutNutritionParagraph('Uma orientação completa.\nOutra orientação.\n\nTerceiro parágrafo.')
    expect(lines.map(line => line.text)).toEqual([
      'Uma orientação completa.', 'Outra orientação.', '', 'Terceiro parágrafo.',
    ])
    expect(lines.every(line => line.wordSpacing === 0)).toBe(true)
  })

  it('gera PDF A4 com timbre, rodapé mínimo, página e sem homologação repetida', async () => {
    const pdf = buildNutritionDocumentPdf(document)
    expect(pdf.type).toBe('application/pdf')
    const bytes = new Uint8Array(await pdf.arrayBuffer())
    const latin1 = Array.from(bytes, b => String.fromCharCode(b)).join('')
    expect(latin1.startsWith('%PDF-1.4')).toBe(true)
    expect(latin1).toContain('/MediaBox [0 0 595 842]')
    expect(latin1).toContain('Página 1 de 1')
    expect(latin1).toContain('Paciente: Paciente autorizado')
    expect(latin1).toContain('Registro profissional: CRN 1916')
    expect(latin1).not.toContain('Função: Nutricionista')
    expect(latin1).toContain('Documento gerado em:')
    expect(latin1).toContain('0.85 0.93 0.98 rg')
    expect(latin1).toContain('0.88 0.95 0.86 rg')
    expect(latin1).toContain('45 745 cm')
    expect(latin1).not.toContain('Nutricionista Oncológica e Paliativista')
    expect(latin1).not.toContain('Responsável: Nutricionista responsável')
  })

  it('pagina texto extenso sem descartar seções e mantém numeração', async () => {
    const large = {
      ...document,
      plan_snapshot: {
        ...(document.plan_snapshot),
        oncology_guidance: Array.from({ length: 95 }, () => 'Orientação individualizada para acompanhamento nutricional com descrição detalhada e análise do tratamento atual.').join(' '),
        additional_notes: 'OBSERVAÇÃO FINAL DOCUMENTAL',
      },
    }
    const pdf = buildNutritionDocumentPdf(large)
    const bytes = new Uint8Array(await pdf.arrayBuffer())
    const latin1 = Array.from(bytes, b => String.fromCharCode(b)).join('')
    expect(latin1).toContain('OBSERVAÇÃO FINAL DOCUMENTAL')
    expect(latin1).toContain('Página 1 de ')
    expect(latin1).toContain('Página 2 de ')
  })

  it('wraps unbroken long content and preserves the complete sequence', () => {
    const text = 'A'.repeat(6001)
    const lines = layoutNutritionParagraph(text)
    expect(lines.length).toBeGreaterThan(1)
    expect(lines.map(line => line.text).join('')).toBe(text)
  })

  it('wraps long document titles and keeps subsequent sections visible', async () => {
    const pdf = buildNutritionDocumentPdf({
      ...document,
      plan_snapshot: { ...document.plan_snapshot, document_title: 'TÍTULO '.repeat(100), additional_notes: 'FIM DO PLANO' },
    })
    const bytes = new Uint8Array(await pdf.arrayBuffer())
    const latin1 = Array.from(bytes, b => String.fromCharCode(b)).join('')
    expect(latin1).toContain('FIM DO PLANO')
    expect((latin1.match(/TÍTULO/g) ?? []).length).toBe(100)
  })

  it('uses Juliana qualification only for the persisted professional ID, once at the end', async () => {
    const sample = {
      ...document, professional_id: 'a15e4860-82be-44cf-965c-2d76fb66c062',
      author_name: 'Juliana Teixeira Rios Camargo', author_registration: 'CRN 1916',
      plan_snapshot: { ...document.plan_snapshot, additional_notes: 'ÚLTIMA ORIENTAÇÃO DO PLANO' },
    }
    const pdf = buildNutritionDocumentPdf(sample)
    const raw = Array.from(new Uint8Array(await pdf.arrayBuffer()), b => String.fromCharCode(b)).join('')
    expect(raw.match(/Nutricionista Oncológica e Paliativista/g)).toHaveLength(1)
    expect(raw.match(/Juliana Teixeira Rios Camargo/g)).toHaveLength(1)
    expect(raw.indexOf('Juliana Teixeira Rios Camargo')).toBeGreaterThan(raw.indexOf('ÚLTIMA ORIENTAÇÃO DO PLANO'))
    expect(raw).toContain('(CRN 1916)')
    expect(raw).not.toContain('CRN: CRN')
    const other = buildNutritionDocumentPdf({ ...sample, professional_id: 'another-professional' })
    const otherRaw = Array.from(new Uint8Array(await other.arrayBuffer()), b => String.fromCharCode(b)).join('')
    expect(otherRaw).not.toContain('Nutricionista Oncológica e Paliativista')
  })
})
