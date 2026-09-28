export type ReportExport = Readonly<{
  scope: string
  from: string
  to: string
  specialty: string
  reportType?: string
  issuedAt: string
  sections: readonly Readonly<{ title: string; metrics: readonly (readonly [string, string])[] }>[]
}>

export function reportLines(report: ReportExport): string[] {
  return [
    'CAPO - Centro de Acolhimento ao Paciente Oncológico',
    'Relatórios Gerenciais',
    `Escopo: ${report.scope}`,
    `Período: ${report.from} a ${report.to}`,
    `Especialidade: ${report.specialty}`,
    ...(report.reportType ? [`Relatório: ${report.reportType}`] : []),
    `Emitido em: ${report.issuedAt}`,
    '',
    ...report.sections.flatMap((section) => [section.title, ...section.metrics.map(([label, value]) => `${label}: ${value}`), '']),
  ]
}

function bytes(value: string) {
  return Uint8Array.from(value, (character) => {
    const code = character.charCodeAt(0)
    return code < 256 ? code : 63
  })
}

function escape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function join(parts: readonly Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  parts.forEach((part) => { result.set(part, offset); offset += part.length })
  return result
}

export function buildReportPdf(report: ReportExport): Blob {
  const lines = reportLines(report).flatMap((line) => {
    if (line.length <= 94) return [line]
    const result: string[] = []
    let current = ''
    for (const word of line.split(' ')) {
      if (current && `${current} ${word}`.length > 94) { result.push(current); current = word }
      else current = current ? `${current} ${word}` : word
    }
    if (current) result.push(current)
    return result
  })
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / 47)) }, (_, index) => lines.slice(index * 47, (index + 1) * 47))
  const pageIds = pages.map((_, index) => 4 + index * 2)
  const objects: Uint8Array[] = [
    bytes('<< /Type /Catalog /Pages 2 0 R >>'),
    bytes(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`),
    bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
  ]
  pages.forEach((page, index) => {
    const stream = bytes(`BT\n/F1 10 Tf\n45 795 Td\n15 TL\n${page.map((line) => `(${escape(line)}) Tj\nT*\n`).join('')}ET\n`)
    const streamId = pageIds[index] + 1
    objects.push(bytes(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`))
    objects.push(join([bytes(`<< /Length ${stream.length} >>\nstream\n`), stream, bytes('endstream')]))
  })
  const header = bytes('%PDF-1.4\n')
  const parts: Uint8Array[] = [header]
  const offsets = [0]
  let offset = header.length
  objects.forEach((object, index) => {
    offsets.push(offset)
    const piece = join([bytes(`${index + 1} 0 obj\n`), object, bytes('\nendobj\n')])
    parts.push(piece)
    offset += piece.length
  })
  parts.push(bytes(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((position) => `${String(position).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`))
  return new Blob([join(parts)], { type: 'application/pdf' })
}
