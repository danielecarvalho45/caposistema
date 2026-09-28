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


it('mantem indicadores zerados como dados validos no PDF gerencial', async () => {
  const input = {
    scope: 'Gestor / Titular',
    from: '2026-09-01',
    to: '2026-09-28',
    specialty: 'Todas',
    reportType: 'Visão geral',
    issuedAt: '28/09/2026 14:35',
    sections: [
      {
        title: 'Agenda',
        metrics: [
          ['Agendados no período', '0'],
          ['Realizados no período', '0'],
          ['Faltas no período', '0'],
        ] as const,
      },
    ],
  }
  expect(reportLines(input)).toContain('Agendados no período: 0')
  expect(reportLines(input)).toContain('Realizados no período: 0')
  expect(reportLines(input)).toContain('Faltas no período: 0')
  const pdf = buildReportPdf(input)
  const data = await pdf.arrayBuffer()
  const content = Array.from(new Uint8Array(data), (byte) => String.fromCharCode(byte)).join('')
  expect(content).toContain('Agendados no período: 0')
  expect(content).toContain('Realizados no período: 0')
  expect(content).toContain('Faltas no período: 0')
  expect(content).toContain('/ProcSet [/PDF /Text /ImageC]')
  expect(content).toContain('CAPO | Secretaria Municipal de Saude | Prefeitura de Pouso Alegre')
})
