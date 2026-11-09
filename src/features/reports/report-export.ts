import { buildCapoDocumentPdf, type CapoPdfChart } from '../../lib/pdf/capo-document-pdf'


export type ReportExport = Readonly<{
  scope: string
  from: string
  to: string
  specialty: string
  reportType?: string
  issuedAt: string
  generatedBy?: string
  generatedByRole?: string
  generatedAt?: Date
  sections: readonly Readonly<{ title: string; metrics: readonly (readonly [string, string])[] }>[]
}>

export function reportLines(report: ReportExport): string[] {
  return [
    'Relatórios Gerenciais',
    `Função: ${report.generatedByRole || report.scope}`,
    `Profissional responsável: ${report.generatedBy || 'Não identificado'}`,
    `Período: ${report.from} a ${report.to}`,
    `Especialidade: ${report.specialty}`,
    ...(report.reportType ? [`Relatório: ${report.reportType}`] : []),
    `Emitido em: ${report.issuedAt}`,
    '',
    ...(report.sections.length ? report.sections.flatMap((section) => [
      section.title,
      ...section.metrics.map(([label, value]) => `${label}: ${value}`),
      ...sectionAnalysis(section),
      '',
    ]) : ['Nenhum registro retornado para os filtros selecionados.']),
  ]
}

function numericValue(text: string): number | null {
  const normalized = text.trim().replace(',', '.')
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

function sectionAnalysis(section: ReportExport['sections'][number]) {
  const numeric = section.metrics.flatMap(([label, value]) => {
    const parsed = numericValue(value)
    return parsed === null ? [] : [{ label, value: parsed }]
  })
  if (!numeric.length) return ['Análise: não há indicadores numéricos comparáveis nesta seção.']
  const active = numeric.filter((item) => item.value > 0)
  const summary = active.length
    ? `Análise: ${active.length} de ${numeric.length} indicadores numéricos apresentam valor maior que zero. ${active.slice(0, 3).map((item) => `${item.label}: ${item.value}`).join('; ')}.`
    : `Análise: os ${numeric.length} indicadores numéricos apresentados registram zero.`
  return [summary, 'Nota: os indicadores podem representar períodos, unidades ou situações distintas; não devem ser somados sem correspondência.']
}

export function buildReportPdf(report: ReportExport): Blob {
  const lines = reportLines(report).flatMap((line) => {
    if (line.length <= 72) return [line]
    const result: string[] = []
    let current = ''
    for (const word of line.split(' ')) {
      if (current && `${current} ${word}`.length > 72) {
        result.push(current)
        current = word
      } else {
        current = current ? `${current} ${word}` : word
      }
    }
    if (current) result.push(current)
    return result
  })
  return buildCapoDocumentPdf(lines, { fontSize: 12, lineHeight: 17, linesPerPage: 34, reportLayout: true, generatedBy: report.generatedBy ?? 'Autoria não informada', generatedByRole: report.generatedByRole ?? report.scope, generatedAt: report.generatedAt })
}

export type ChartMode = 'pizza' | 'barras' | 'ambos'

export function buildReportChartPdf(report: ReportExport, mode: ChartMode): Blob {
  const charts: CapoPdfChart[] = []
  for (const section of report.sections) {
    const points = section.metrics.flatMap(([label, raw]) => {
      const value = numericValue(raw)
      return value === null || /percentual|taxa|%|total|absenteísmo/i.test(label) ? [] : [{ label, value }]
    }).slice(0, 6)
    if (!points.length) continue
    const positive = points.filter((point) => point.value > 0)
    const analysis = positive.length
      ? `Nesta seleção, ${positive.length} de ${points.length} indicadores exibidos têm registros positivos. Destaque: ${positive.slice(0, 2).map((point) => `${point.label} (${point.value})`).join(' e ')}. Os indicadores não representam necessariamente parcelas de um total.`
      : 'Todos os indicadores exibidos estão com valor zero no período ou situação consultada. Não há distribuição positiva a demonstrar.'
    if (mode === 'barras' || mode === 'ambos') charts.push({ type: 'barras', title: `${section.title} - gráfico de barras`, points, analysis })
    if (mode === 'pizza' || mode === 'ambos') {
      const categories = points.filter((point) => /realizad|faltas|cancelad|pendentes|concluíd|recusad/i.test(point.label))
      if (categories.length >= 2 && categories.some((item) => item.value > 0)) {
        charts.push({ type: 'pizza', title: `${section.title} - distribuição de situações`, points: categories, analysis: `Distribuição proporcional somente das categorias apresentadas: ${categories.map((item) => `${item.label} (${item.value})`).join('; ')}. Percentuais referem-se ao total dessas categorias, não ao total de pacientes.` })
      } else {
        charts.push({ type: 'pizza', title: `${section.title} - gráfico de pizza`, points: [], analysis: 'Gráfico de pizza não aplicável: não há duas categorias de situação com distribuição positiva comprovada. Os indicadores apresentados podem ter unidades e bases distintas; não é correto transformá-los em fatias.' })
      }
    }
  }
  if (!charts.length) charts.push({ type: 'barras', title: 'Indicadores não disponíveis', points: [], analysis: 'Não foram retornados indicadores numéricos para gerar este demonstrativo.' })
  const header = ['Relatório gráfico demonstrativo', `Função: ${report.generatedByRole || report.scope}`, `Profissional responsável: ${report.generatedBy || 'Não identificado'}`, `Período: ${report.from} a ${report.to}`, `Especialidade: ${report.specialty}`, `Relatório: ${report.reportType ?? 'Visão geral'}`, `Emitido em: ${report.issuedAt}`]
  return buildCapoDocumentPdf(header, { fontSize: 12, lineHeight: 17, charts, reportLayout: true, generatedBy: report.generatedBy ?? 'Autoria não informada', generatedByRole: report.generatedByRole ?? report.scope, generatedAt: report.generatedAt })
}
