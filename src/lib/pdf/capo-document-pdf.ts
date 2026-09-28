const CAPO_DOCUMENT_HEADER_JPEG_BASE64 =
  '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PEJaKJ1H3qq9VOoj7TVeqnBLRROoj7VVeqnUfear1E4JaKJ1Efaqr1U6j71VeqnBLRROo+9VXqp1H3qq9VOCWiidR96qvVTqI+1VXqpwS0UTqPvVV6q86h71VeqnBMRROo+9VXqp1H3qq9VOCWiidR96qvVTqI+1VXqpwS0UTqPvNT6idRH2qq9VOCWiidR95qvVTqPvVV6qcEtFE6j71VeonUfear1U4JaKJ1Efaqr1E6j7zVeonBLRROo+9VXqp1H3qq9VOCWiidR96qvVTqPvVV6qcEtFE6j71VeqnUR9qqvVTgloonUPeqr1U6j71VeqnBLRROoj7VVeqnUfeqr1U4JaKH1Efaqr1V71Efaqr1U4JaKJ1Efaqr1U6j71VeqnBLRROoD7VVeqvOoe9VXqpwTEUTqPvVV6qdR96qvVTgloonUR9pqvUTqI+1VXqpwS0UTqPvVV6qdR96qvVTgloonUR9qqvVTqPvVV6qcEtFE6iPtVV6qdR96qvVTgloo0dH0cgd1iodjudJkFSVCRERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERAREQEREBERB//Z'

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

function base64Bytes(value: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const clean = value.replace(/[^A-Za-z0-9+/=]/g, '')
  const output: number[] = []
  for (let index = 0; index < clean.length; index += 4) {
    const a = alphabet.indexOf(clean[index] ?? 'A')
    const b = alphabet.indexOf(clean[index + 1] ?? 'A')
    const c = clean[index + 2] === '=' ? -1 : alphabet.indexOf(clean[index + 2] ?? 'A')
    const d = clean[index + 3] === '=' ? -1 : alphabet.indexOf(clean[index + 3] ?? 'A')
    output.push((a << 2) | (b >> 4))
    if (c >= 0) output.push(((b & 15) << 4) | (c >> 2))
    if (d >= 0 && c >= 0) output.push(((c & 3) << 6) | d)
  }
  return Uint8Array.from(output)
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

  const logo = base64Bytes(CAPO_DOCUMENT_HEADER_JPEG_BASE64)
  const pageIds = pages.map((_, index) => 5 + index * 2)
  const objects: Uint8Array[] = [
    bytes('<< /Type /Catalog /Pages 2 0 R >>'),
    bytes(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`),
    bytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
    join([
      bytes(`<< /Type /XObject /Subtype /Image /Width 450 /Height 150 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.length} >>\nstream\n`),
      logo,
      bytes('\nendstream'),
    ]),
  ]

  pages.forEach((page, index) => {
    const stream = bytes(
      `q\n505 0 0 168.333 45 650 cm\n/Logo Do\nQ\nBT\n/F1 ${fontSize} Tf\n45 625 Td\n${lineHeight} TL\n${page.map((line) => `(${escape(line)}) Tj\nT*\n`).join('')}ET\n`,
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
