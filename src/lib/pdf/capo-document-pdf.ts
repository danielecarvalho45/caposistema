import {
  CAPO_DOCUMENT_LOGO_HEIGHT,
  CAPO_DOCUMENT_LOGO_WIDTH,
  getCapoDocumentLogoJpeg,
} from './capo-document-brand'

export const CAPO_DOCUMENT_HEADER_LABEL =
  'CAPO — Centro de Acolhimento Oncológico de Pouso Alegre · Secretaria Municipal de Saúde de Pouso Alegre-MG'

type CapoPdfOptions = Readonly<{
  fontSize?: number
  lineHeight?: number
  linesPerPage?: number
}>

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

export function buildCapoDocumentPdf(
  lines: readonly string[],
  options: CapoPdfOptions = {},
) {
  const fontSize = options.fontSize ?? 10
  const lineHeight = options.lineHeight ?? 14
  const linesPerPage = options.linesPerPage ?? 40
  const pages = Array.from(
    { length: Math.max(1, Math.ceil(lines.length / linesPerPage)) },
    (_, page) => lines.slice(page * linesPerPage, (page + 1) * linesPerPage),
  )

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
      `q\n505 0 0 90 45 738 cm\n/Logo Do\nQ\nBT\n/F1 ${fontSize} Tf\n45 716 Td\n${lineHeight} TL\n${page.map((line) => `(${escape(line)}) Tj\nT*\n`).join('')}ET\n`,
    )
    const contentId = pageIds[index] + 1
    objects.push(
      bytes(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> /XObject << /Logo 4 0 R >> >> /Contents ${contentId} 0 R >>`,
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
