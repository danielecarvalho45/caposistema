import { expect, it } from 'vitest'
import { buildCapoDocumentPdf, capoPdfFooter } from '../../src/lib/pdf/capo-document-pdf'

it('repete o timbre integral e o rodapé em todas as páginas', async () => {
  const generatedAt = new Date('2026-09-28T15:30:00Z')
  expect(capoPdfFooter('Daniele Carvalho', generatedAt)).toBe('Documento gerado em 28 de setembro de 2026, às 12:30, por Daniele Carvalho.')
  const pdf = buildCapoDocumentPdf(Array.from({ length: 65 }, (_, index) => `Linha ${index + 1}`), { generatedBy: 'Daniele Carvalho', generatedAt })
  const content = new TextDecoder('latin1').decode(await pdf.arrayBuffer())
  expect(content).toContain('/Width 1448 /Height 231')
  expect(content).toContain('505 0 0 80.56 45 745 cm')
  expect(content).toContain('/Count 2')
  expect(content.match(/\/Logo Do/g)).toHaveLength(2)
  expect(content.match(/Documento gerado em 28 de setembro de 2026, às 12:30, por Daniele Carvalho/g)).toHaveLength(2)
  expect(content).not.toContain('CAPO | Secretaria Municipal de Saude | Prefeitura de Pouso Alegre')
  expect(content).toContain('Linha 65')
})
