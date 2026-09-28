import { expect, it } from 'vitest'
import { buildReportPdf, reportLines } from '../../src/features/reports/report-export'

it('exporta apenas os indicadores e recortes recebidos, com cabeçalho e várias páginas quando necessário', async () => {
  const input = {
    scope: 'Coordenador', from: '2026-09-01', to: '2026-09-28', specialty: 'Nutrição', issuedAt: '28/09/2026 12:00',
    sections: [{ title: 'Pacientes', metrics: Array.from({ length: 55 }, (_, index) => [`Indicador ${index}`, String(index)] as const) }],
  }
  expect(reportLines(input)).toContain('Especialidade: Nutrição')
  const pdf = buildReportPdf(input)
  expect(pdf.type).toBe('application/pdf')
  const data = await pdf.arrayBuffer()
  const content = Array.from(new Uint8Array(data), (byte) => String.fromCharCode(byte)).join('')
  expect(content).toContain('/Count 2')
  expect(content).toContain('/Subtype /Image')
  expect(content).toContain('/XObject << /Logo 4 0 R >>')
  expect(content).toContain('/Logo Do')
  expect(content).toContain('Indicador 54: 54')
  expect(content).not.toContain('Dado inventado')
})
