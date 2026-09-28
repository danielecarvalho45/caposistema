import { buildCapoDocumentPdf } from '../../lib/pdf/capo-document-pdf'


export type ReportExport = Readonly<{
  scope: string
  from: string
  to: string
  specialty: string
  reportType?: string
  issuedAt: string
  generatedBy?: string
  generatedAt?: Date
  sections: readonly Readonly<{ title: string; metrics: readonly (readonly [string, string])[] }>[]
}>

export function reportLines(report: ReportExport): string[] {
  return [
    'Relatórios Gerenciais',
    `Escopo: ${report.scope}`,
    `Período: ${report.from} a ${report.to}`,
    `Especialidade: ${report.specialty}`,
    ...(report.reportType ? [`Relatório: ${report.reportType}`] : []),
    `Emitido em: ${report.issuedAt}`,
    '',
    ...(report.sections.length ? report.sections.flatMap((section) => [section.title, ...section.metrics.map(([label, value]) => `${label}: ${value}`), '']) : ['Nenhum registro retornado para os filtros selecionados.']),
  ]
}

export function buildReportPdf(report: ReportExport): Blob {
  const lines = reportLines(report).flatMap((line) => {
    if (line.length <= 94) return [line]
    const result: string[] = []
    let current = ''
    for (const word of line.split(' ')) {
      if (current && `${current} ${word}`.length > 94) {
        result.push(current)
        current = word
      } else {
        current = current ? `${current} ${word}` : word
      }
    }
    if (current) result.push(current)
    return result
  })
  return buildCapoDocumentPdf(lines, { fontSize: 10, lineHeight: 15, linesPerPage: 40, generatedBy: report.generatedBy ?? 'Autoria não informada', generatedAt: report.generatedAt })
}
