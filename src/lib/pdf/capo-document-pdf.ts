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
}>

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
  const pages = Array.from(
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
    const stream = bytes(
      `q\n505 0 0 ${logoHeight.toFixed(2)} 45 745 cm\n/Logo Do\nQ\nq\n1 1 1 rg\n220 789 158 31 re f\nQ\nBT\n/F1 8 Tf\n0 0.27 0.53 rg\n241 807 Td\n(CENTRO DE APOIO AO) Tj\n0 -11 Td\n(PACIENTE ONCOLÓGICO) Tj\nET\nBT\n/F1 ${fontSize} Tf\n0 0 0 rg\n45 706 Td\n${lineHeight} TL\n${page.map((line) => `(${escape(line)}) Tj\nT*\n`).join('')}ET\nBT\n/F1 8 Tf\n0 0 0 rg\n11 TL\n45 54 Td\n${footerLines(footer).map((line) => `(${escape(line)}) Tj\nT*\n`).join('')}ET\n`,
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
