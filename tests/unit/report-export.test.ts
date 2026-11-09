import { expect, it } from 'vitest'
import { buildReportPdf, buildReportChartPdf, reportLines } from '../../src/features/reports/report-export'

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
  expect(content).toContain('Página 1 de 2')
  expect(content).toContain('Página 2 de 2')
  expect(content).toContain('/Subtype /Image')
  expect(content).toContain('/XObject << /Logo 4 0 R >>')
  expect(content).toContain('/Logo Do')
  expect(content).toContain('Indicador 54: 54')
  expect(content).not.toContain('Dado inventado')
})

it('identifica profissional e função sem termo escopo e centraliza o titulo do grafico', async () => {
  const report = {
    scope: 'Coordenador', generatedBy: 'Profissional real autenticado', generatedByRole: 'Coordenador',
    from: '2026-11-01', to: '2026-11-09', specialty: 'Todas', issuedAt: '09/11/2026 10:15',
    sections: [{ title: 'Agenda', metrics: [['Realizados no período', '10'], ['Faltas no período', '2']] as const }],
  }
  const chart = new TextDecoder('latin1').decode(await buildReportChartPdf(report, 'ambos').arrayBuffer())
  const analytic = new TextDecoder('latin1').decode(await buildReportPdf(report).arrayBuffer())
  for (const content of [chart, analytic]) {
    expect(content).toContain('Função: Coordenador')
    expect(content).toContain('Profissional responsável: Profissional real autenticado')
    expect(content).not.toContain('Escopo:')
  }
  expect(chart).toContain('Página 1 de 2')
  expect(chart).toContain('Página 2 de 2')
  expect(chart).toMatch(/1 0 0 1 \d+\.\d+ 706 Tm\n\(Relatório gráfico demonstrativo\)/)
  expect(chart).toMatch(/\d+\.\d+ 580 Td\n\(Agenda - gráfico de barras\)/)
})

it('gera PDF grafico independente em barras e pizza com analise e sem somar indicadores distintos', async () => {
  const report = {
    scope: 'Coordenador', from: '2026-11-01', to: '2026-11-09', specialty: 'Todas',
    issuedAt: '09/11/2026 10:00', sections: [{ title: 'Agenda', metrics: [
      ['Realizados no período', '10'], ['Faltas no período', '2'], ['Cancelados no período', '3'],
      ['Taxa de absenteísmo (%)', '16,7'],
    ] as const }],
  }
  const pdf = buildReportChartPdf(report, 'ambos')
  const content = new TextDecoder('latin1').decode(await pdf.arrayBuffer())
  expect(content).toContain('/Count 2')
  expect(content).toContain('Relatório gráfico demonstrativo')
  expect(content).toContain('gráfico de barras')
  expect(content).toContain('distribuição de situações')
  expect(content).toContain('Percentuais referem-se ao total')
  expect(content).not.toContain('16,7:')
})

it('nao inventa distribuicao de pizza quando indicadores se sobrepoem', async () => {
  const pdf = buildReportChartPdf({
    scope: 'Coordenador', from: '2026-11-01', to: '2026-11-09', specialty: 'Todas', issuedAt: '09/11/2026',
    sections: [{ title: 'Pacientes', metrics: [['Total atual', '32'], ['Ativos atualmente', '32'], ['Cadastrados no período', '31']] }],
  }, 'pizza')
  const content = new TextDecoder('latin1').decode(await pdf.arrayBuffer())
  expect(content).toContain('não aplicável')
  expect(content).toContain('/Count 1')
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
  expect(content).not.toContain('CAPO | Secretaria Municipal de Saude | Prefeitura de Pouso Alegre')
})

it('gera documento sem registros com timbre, filtros e autoria, sem inventar indicadores', async () => {
  const pdf = buildReportPdf({
    scope: 'Gestor / Titular', from: '2026-09-01', to: '2026-09-28',
    specialty: 'Todas', issuedAt: '28/09/2026 17:00', generatedBy: 'Gestor autenticado', sections: [],
  })
  const content = new TextDecoder('latin1').decode(await pdf.arrayBuffer())
  expect(content).toContain('/Subtype /Image')
  expect(content).toContain('Relatórios Gerenciais')
  expect(content).toContain('Período: 2026-09-01 a 2026-09-28')
  expect(content).toContain('Nenhum registro retornado para os filtros selecionados.')
  expect(content).toContain('por Gestor autenticado')
  expect(content).not.toContain('Total no período: 0')
})
