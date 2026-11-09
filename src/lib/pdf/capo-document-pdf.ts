import {
  CAPO_DOCUMENT_LOGO_HEIGHT,
  CAPO_DOCUMENT_LOGO_WIDTH,
  getCapoDocumentLogoJpeg,
} from './capo-document-brand'

export const CAPO_DOCUMENT_HEADER_LABEL =
  'CAPO — Centro de Apoio ao Paciente Oncológico · Secretaria Municipal de Saúde de Pouso Alegre-MG'

type CapoPdfOptions = Readonly<{
  fontSize?: number
  lineHeight?: number
  linesPerPage?: number
  generatedBy: string
  generatedByRole?: string
  generatedAt?: Date
  charts?: readonly CapoPdfChart[]
  reportLayout?: boolean
}>

export type CapoPdfChart = Readonly<{
  type: 'pizza' | 'barras'
  title: string
  points: readonly Readonly<{ label: string; value: number }>[]
  analysis: string
}>

const chartColors = ['0.09 0.43 0.75', '0.19 0.59 0.39', '0.93 0.55 0.15', '0.73 0.30 0.52', '0.36 0.37 0.73', '0.23 0.63 0.64']

// Helvetica proportional width approximation for placing short section headings.
function centeredX(value: string, fontSize: number) {
  const estimatedWidth = Array.from(value).reduce((width, character) => {
    if (/[ilI1.,:;! ]/.test(character)) return width + 0.28
    if (/[MW@]/.test(character)) return width + 0.86
    return width + 0.54
  }, 0) * fontSize
  return Math.max(45, (595 - estimatedWidth) / 2)
}

function chartDrawing(chart: CapoPdfChart) {
  const points = chart.points.slice(0, 6)
  const total = points.reduce((sum, point) => sum + point.value, 0)
  const lines: string[] = ['BT', '/F1 14 Tf', '0 0.27 0.53 rg', `${centeredX(chart.title, 14).toFixed(2)} 580 Td`, `(${escape(chart.title)}) Tj`, 'ET']
  if (total <= 0 || !points.length) {
    lines.push('BT', '/F1 12 Tf', '0 0 0 rg', '45 485 Td', '(Nao ha valores positivos para representar neste grafico.) Tj', 'ET')
  } else if (chart.type === 'pizza') {
    let angle = -Math.PI / 2
    points.forEach((point, index) => {
      const next = angle + 2 * Math.PI * point.value / total
      const segments = Math.max(2, Math.ceil((next - angle) / (Math.PI / 36)))
      const coords = Array.from({ length: segments + 1 }, (_, i) => {
        const a = angle + (next - angle) * i / segments
        return `${(190 + 108 * Math.cos(a)).toFixed(2)} ${(448 + 108 * Math.sin(a)).toFixed(2)} ${i === 0 ? 'l' : 'l'}`
      })
      lines.push(`${chartColors[index]} rg`, '190 448 m', ...coords, 'h f')
      angle = next
    })
    points.forEach((point, index) => {
      const percentage = (point.value * 100 / total).toFixed(1).replace('.', ',')
      lines.push(`${chartColors[index]} rg`, `330 ${553 - index * 29} 10 10 re f`, 'BT', '/F1 9 Tf', '0 0 0 rg', `345 ${554 - index * 29} Td`, `(${escape(`${point.label.slice(0, 23)}: ${point.value} (${percentage}%)`)}) Tj`, 'ET')
    })
  } else {
    const max = Math.max(...points.map((point) => point.value))
    lines.push('0.7 0.7 0.7 RG', '65 325 m 535 325 l S')
    points.forEach((point, index) => {
      const x = 83 + index * 77
      const height = Math.max(1, 205 * point.value / max)
      lines.push(`${chartColors[index]} rg`, `${x} 325 43 ${height.toFixed(2)} re f`, 'BT', '/F1 10 Tf', '0 0 0 rg', `${x} ${(333 + height).toFixed(2)} Td`, `(${escape(String(point.value))}) Tj`, 'ET', 'BT', '/F1 9 Tf', `${x + 14} 309 Td`, `(${index + 1}) Tj`, 'ET')
    })
    points.forEach((point, index) => {
      lines.push(`${chartColors[index]} rg`, `65 ${289 - index * 15} 9 9 re f`, 'BT', '/F1 9 Tf', '0 0 0 rg', `80 ${289 - index * 15} Td`, `(${escape(`${index + 1}. ${point.label}: ${point.value}`)}) Tj`, 'ET')
    })
  }
  const words = chart.analysis.split(/\s+/)
  const paragraphs: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + ' ' + word).length > 88) { paragraphs.push(current); current = word }
    else current = current ? `${current} ${word}` : word
  }
  if (current) paragraphs.push(current)
  lines.push('BT', '/F1 11 Tf', '0 0 0 rg', `45 ${chart.type === 'barras' ? 187 : 244} Td`, '15 TL', ...paragraphs.slice(0, chart.type === 'barras' ? 6 : 9).flatMap((line) => [`(${escape(line)}) Tj`, 'T*']), 'ET')
  return lines.join('\n') + '\n'
}

export function capoPdfFooter(
  generatedBy: string,
  generatedAt: Date,
  generatedByRole = 'Função não informada',
): string {
  const date = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  }).format(generatedAt)
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo',
  }).format(generatedAt)
  return `Documento gerado em ${date}, às ${time}, por ${generatedBy.trim() || 'Autoria não informada'} — Função: ${generatedByRole.trim() || 'Função não informada'}.`
}

function pdfSafe(value: string) {
  return Array.from(value).map((character) => {
    const code = character.charCodeAt(0)
    if (code <= 255) return character
    return ({ '–': '-', '—': '-', '“': '"', '”': '"', '‘': "'", '’': "'", '•': '*', '→': '>' } as Record<string, string>)[character] ?? '?'
  }).join('')
}

function bytes(value: string) {
  return Uint8Array.from(Array.from(pdfSafe(value)).map((character) => character.charCodeAt(0) & 255))
}

function join(parts: readonly Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((length, part) => length + part.length, 0))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

function escape(value: string) {
  return pdfSafe(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function footerLines(value: string): string[] {
  const words = value.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (current && `${current} ${word}`.length > 105) { lines.push(current); current = word }
    else current = current ? `${current} ${word}` : word
  }
  if (current) lines.push(current)
  return lines
}

export function buildCapoDocumentPdf(
  lines: readonly string[],
  options: CapoPdfOptions,
) {
  const fontSize = options.fontSize ?? 10
  const lineHeight = options.lineHeight ?? 14
  const linesPerPage = options.linesPerPage ?? 40
  const footer = capoPdfFooter(
    options.generatedBy,
    options.generatedAt ?? new Date(),
    options.generatedByRole,
  )
  const pages = options.charts ? options.charts.map(() => lines.slice(0, 7)) : Array.from(
    { length: Math.max(1, Math.ceil(lines.length / linesPerPage)) },
    (_, page) => lines.slice(page * linesPerPage, (page + 1) * linesPerPage),
  )

  const logoHeight = 505 * CAPO_DOCUMENT_LOGO_HEIGHT / CAPO_DOCUMENT_LOGO_WIDTH
  const logo = getCapoDocumentLogoJpeg()
  const pageIds = pages.map((_, index) => 5 + index * 2)
  const objects: Uint8Array[] = [
    bytes('<< /Type /Catalog /Pages 2 0 R >>'),
    bytes(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`),
    bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
    join([
      bytes(`<< /Type /XObject /Subtype /Image /Width ${CAPO_DOCUMENT_LOGO_WIDTH} /Height ${CAPO_DOCUMENT_LOGO_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.length} >>\nstream\n`),
      logo,
      bytes('\nendstream'),
    ]),
  ]

  pages.forEach((page, index) => {
    const contentLines = page.map((line, lineIndex) => {
      const isTitle = options.reportLayout && lineIndex === 0
      const isSection = options.reportLayout && lineIndex > 0 && page[lineIndex - 1] === '' && line !== ''
      const size = isTitle ? 16 : isSection ? 14 : fontSize
      const x = isTitle ? centeredX(line, size) : 45
      const y = 706 - lineIndex * lineHeight
      const color = isTitle || isSection ? '0 0.27 0.53' : '0 0 0'
      return `BT\n/F1 ${size} Tf\n${color} rg\n1 0 0 1 ${x.toFixed(2)} ${y} Tm\n(${escape(line)}) Tj\nET\n`
    }).join('')
    const pageNumber = `Página ${index + 1} de ${pages.length}`
    const stream = bytes(
      `q\n505 0 0 ${logoHeight.toFixed(2)} 45 745 cm\n/Logo Do\nQ\nq\n1 1 1 rg\n220 789 158 31 re f\nQ\nBT\n/F1 8 Tf\n0 0.27 0.53 rg\n241 807 Td\n(CENTRO DE APOIO AO) Tj\n0 -11 Td\n(PACIENTE ONCOLÓGICO) Tj\nET\n${contentLines}${options.charts?.[index] ? chartDrawing(options.charts[index]) : ''}BT\n/F1 9 Tf\n0 0 0 rg\n11 TL\n45 54 Td\n${footerLines(footer).map((line) => `(${escape(line)}) Tj\nT*\n`).join('')}ET\nBT\n/F1 9 Tf\n0 0 0 rg\n475 20 Td\n(${escape(pageNumber)}) Tj\nET\n`,
    )
    const contentId = pageIds[index] + 1
    objects.push(
      bytes(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /ProcSet [/PDF /Text /ImageC] /Font << /F1 3 0 R >> /XObject << /Logo 4 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    )
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
  parts.push(
    bytes(
      `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((position) => `${String(position).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`,
    ),
  )
  return new Blob([join(parts)], { type: 'application/pdf' })
}
