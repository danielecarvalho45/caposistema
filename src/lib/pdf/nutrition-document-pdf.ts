import {
  CAPO_DOCUMENT_LOGO_HEIGHT,
  CAPO_DOCUMENT_LOGO_WIDTH,
  getCapoDocumentLogoJpeg,
} from './capo-document-brand'

/** Apenas o Plano Alimentar usa este compositor. Relatórios e PDFs gerais permanecem intactos. */
type NutritionDocument = Readonly<Record<string, unknown>>
type TextLine = { text: string; x: number; y: number; size: number; bold: boolean; justify: number }
type Page = { lines: TextLine[]; rules: number[] }
const PAGE_WIDTH = 595
const LEFT = 55
const RIGHT = 540
const CONTENT_WIDTH = RIGHT - LEFT
const BODY_SIZE = 11.25
const BODY_LEADING = 17
const BODY_MIN_Y = 82
const HELVETICA_ASCII = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584] as const
const WIDE = new Set('MW@%')
const winAnsiExtra: Record<string, string> = {
  '–': '-', '—': '-', '“': '"', '”': '"', '‘': "'", '’': "'", '•': '*',
  '→': '>', ' ': ' ', ' ': ' ', '−': '-', '…': '...', 'º': 'º', 'ª': 'ª',
}
function printable(text: string): string {
  return Array.from(text.normalize('NFC')).map((character) => {
    if (character in winAnsiExtra) return winAnsiExtra[character]
    const cp = character.codePointAt(0) ?? 0
    if (cp >= 32 && cp <= 255) return character
    return '?'
  }).join('')
}
function glyphWidth(character: string): number {
  const code = character.charCodeAt(0)
  if (code >= 32 && code <= 126) return HELVETICA_ASCII[code - 32]
  if (code === 32 || code === 160) return 278
  if ('áàâãäåÁÀÂÃÄÅ'.includes(character)) return character === character.toUpperCase() ? 667 : 556
  if ('éèêëÉÈÊË'.includes(character)) return character === character.toUpperCase() ? 667 : 556
  if ('íìîïÍÌÎÏ'.includes(character)) return character === character.toUpperCase() ? 278 : 222
  if ('óòôõöÓÒÔÕÖ'.includes(character)) return character === character.toUpperCase() ? 778 : 556
  if ('úùûüÚÙÛÜ'.includes(character)) return character === character.toUpperCase() ? 722 : 556
  if ('çÇ'.includes(character)) return character === 'Ç' ? 722 : 500
  if ('ñÑ'.includes(character)) return character === 'Ñ' ? 722 : 556
  if (character === 'ª' || character === 'º') return 370
  return WIDE.has(character) ? 780 : 556
}
function width(text: string, size: number): number {
  return Array.from(printable(text)).reduce((sum, character) => sum + glyphWidth(character), 0) * size / 1000
}
function encode(text: string): Uint8Array {
  // Estrutura PDF mantém CR/LF e separadores de objetos/streams sem normalização.
  // Só o conteúdo textual de Tj passa por printable()/pdfEscape().
  return Uint8Array.from(Array.from(text).map(c => c.charCodeAt(0) & 255))
}
function concat(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((n, part) => n + part.length, 0))
  let offset = 0
  for (const part of parts) { output.set(part, offset); offset += part.length }
  return output
}
function pdfEscape(value: string): string {
  return printable(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
function value(record: NutritionDocument | null, key: string): string {
  const field = record?.[key]
  return typeof field === 'string' ? field.trim() : ''
}
function date(valueToFormat: unknown): string {
  const value = typeof valueToFormat === 'string' ? new Date(valueToFormat) : new Date()
  return Number.isFinite(value.getTime())
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }).format(value)
    : 'Data não informada'
}
const sectionLabels = [
  ['breakfast','CAFÉ DA MANHÃ'], ['lunch','ALMOÇO'],
  ['dessert_lunch','SOBREMESA (ALMOÇO)'], ['snack','LANCHE DA TARDE'],
  ['dinner','JANTAR'], ['dessert_dinner','SOBREMESA (JANTAR)'],
  ['hydration','HIDRATAÇÃO'], ['nutritional_supplement','SUPLEMENTAÇÃO NUTRICIONAL'],
  ['other_guidance','OUTRAS ORIENTAÇÕES'],
  ['oncology_guidance','ORIENTAÇÕES NUTRICIONAIS EM TRATAMENTO ONCOLÓGICO'],
  ['additional_notes','OBSERVAÇÕES COMPLEMENTARES'],
] as const

/** A última linha e cada quebra de linha intencional não recebem justificação. */
export function layoutNutritionParagraph(text: string, maxWidth = CONTENT_WIDTH, size = BODY_SIZE) {
  const result: { text: string; justified: boolean; wordSpacing: number }[] = []
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (!words.length) { result.push({ text: '', justified: false, wordSpacing: 0 }); continue }
    let current: string[] = []
    let currentWidth = 0
    function flush(last: boolean) {
      if (!current.length) return
      const line = current.join(' ')
      const gaps = current.length - 1
      const spacing = gaps > 0 ? (maxWidth - width(line, size)) / gaps : 0
      // Evita enormes espaços em linhas com poucas palavras.
      const justified = !last && gaps >= 3 && spacing >= 0 && spacing <= 9.5
      result.push({ text: line, justified, wordSpacing: justified ? spacing : 0 })
      current = []
      currentWidth = 0
    }
    // Break exceptionally long unspaced text without dropping characters.
    const wrappedWords = words.flatMap(word => {
      if (width(word, size) <= maxWidth) return [word]
      const pieces: string[] = []
      let piece = ''
      let pieceWidth = 0
      for (const character of Array.from(word)) {
        const characterWidth = width(character, size)
        if (piece && pieceWidth + characterWidth > maxWidth) {
          pieces.push(piece)
          piece = ''
          pieceWidth = 0
        }
        piece += character
        pieceWidth += characterWidth
      }
      if (piece) pieces.push(piece)
      return pieces
    })
    for (const word of wrappedWords) {
      if (!current.length) {
        current.push(word)
        currentWidth = width(word, size)
      } else if (currentWidth + width(' ' + word, size) <= maxWidth) {
        current.push(word)
        currentWidth += width(' ' + word, size)
      } else {
        flush(false)
        current.push(word)
        currentWidth = width(word, size)
      }
    }
    flush(true)
  }
  return result
}

function layoutPages(document: NutritionDocument): Page[] {
  const pages: Page[] = [{ lines: [], rules: [] }]
  let page = pages[0]
  let y = 707
  function line(text: string, size = BODY_SIZE, bold = false, x = LEFT, spacing = 0, leading = BODY_LEADING) {
    if (y < BODY_MIN_Y + leading) {
      page = { lines: [], rules: [] }
      pages.push(page)
      y = 717
    }
    page.lines.push({ text, x, y, size, bold, justify: spacing })
    y -= leading
  }
  function gap(n = 9) { y -= n }
  function rule() {
    if (y < BODY_MIN_Y + 12) { page = { lines: [], rules: [] }; pages.push(page); y = 717 }
    page.rules.push(y)
    y -= 13
  }
  function center(text: string, size = BODY_SIZE, bold = false, leading = BODY_LEADING) {
    line(text, size, bold, Math.max(LEFT, (PAGE_WIDTH - width(text, size)) / 2), 0, leading)
  }
  const name = value(document, 'author_name') || 'Nutricionista responsável'
  const registration = value(document, 'author_registration')
  center(name, 11.5, true, 19)
  if (registration) center('Registro profissional: ' + registration, 10.4, false, 18)
  center('Pouso Alegre/MG, ' + date(document.created_at), 10.4, false, 18)
  gap(13)
  line('SECRETARIA MUNICIPAL DE SAÚDE — CAPO', 10.2, true, LEFT, 0, 15)
  line('Serviço de Nutrição', 10.2, false, LEFT, 0, 16)
  gap(12)
  line('Paciente: ' + (value(document, 'patient_name') || 'Não informado'), 11, true, LEFT, 0, 17)
  const number = value(document, 'patient_number')
  const cms = value(document, 'cms')
  if (number || cms) line([number ? 'Nº CAPO: ' + number : '', cms ? 'CMS: ' + cms : ''].filter(Boolean).join('   ·   '), 9.5, false, LEFT, 0, 15)
  gap(16)
  const title = value(document.plan_snapshot as NutritionDocument, 'document_title') || 'PLANO ALIMENTAR ORAL'
  for (const titleLine of layoutNutritionParagraph(title.toUpperCase(), CONTENT_WIDTH - 24, 12)) {
    center(titleLine.text, 12, true, 22)
  }
  rule()
  const snapshot = document.plan_snapshot && typeof document.plan_snapshot === 'object'
    ? document.plan_snapshot as NutritionDocument : null
  for (const [key, label] of sectionLabels) {
    const content = value(snapshot, key)
    if (!content) continue
    // Não deixar título órfão da primeira linha do parágrafo.
    if (y < BODY_MIN_Y + 54) { page = { lines: [], rules: [] }; pages.push(page); y = 717 }
    line(label, 10.1, true, LEFT, 0, 17)
    for (const paragraphLine of layoutNutritionParagraph(content)) {
      if (!paragraphLine.text) { gap(7); continue }
      line(paragraphLine.text, BODY_SIZE, false, LEFT, paragraphLine.wordSpacing, BODY_LEADING)
    }
    gap(11)
  }
  return pages
}

export function buildNutritionDocumentPdf(document: NutritionDocument): Blob {
  const pages = layoutPages(document)
  const logo = getCapoDocumentLogoJpeg()
  const logoHeight = 505 * CAPO_DOCUMENT_LOGO_HEIGHT / CAPO_DOCUMENT_LOGO_WIDTH
  const pageIds = pages.map((_, i) => 6 + 2 * i)
  const objects: Uint8Array[] = [
    encode('<< /Type /Catalog /Pages 2 0 R >>'),
    encode('<< /Type /Pages /Kids [' + pageIds.map(id => id + ' 0 R').join(' ') + '] /Count ' + pages.length + ' >>'),
    encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
    encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
    concat([
      encode('<< /Type /XObject /Subtype /Image /Width ' + CAPO_DOCUMENT_LOGO_WIDTH +
        ' /Height ' + CAPO_DOCUMENT_LOGO_HEIGHT +
        ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + logo.length + ' >>\nstream\n'),
      logo, encode('\nendstream'),
    ]),
  ]
  pages.forEach((page, index) => {
    const lines = page.lines.map(item => {
      // Tw altera de fato a distância entre as palavras no próprio PDF.
      const spacing = item.justify ? item.justify.toFixed(3) : '0'
      const font = item.bold ? 'F2' : 'F1'
      return 'BT\n/' + font + ' ' + item.size + ' Tf\n0.12 0.17 0.23 rg\n' +
        '1 0 0 1 ' + item.x.toFixed(2) + ' ' + item.y.toFixed(2) + ' Tm\n' +
        spacing + ' Tw\n(' + pdfEscape(item.text) + ') Tj\n0 Tw\nET\n'
    }).join('')
    const rules = page.rules.map(y => '0.66 0.72 0.78 RG\n0.6 w\n55 ' + y + ' m\n540 ' + y + ' l\nS\n').join('')
    const footer = 'Página ' + (index + 1) + ' de ' + pages.length
    const content = [
      'q\n505 0 0 ' + logoHeight.toFixed(2) + ' 45 745 cm\n/Logo Do\nQ\n',
      lines, rules,
      'BT\n/F1 8.5 Tf\n0.39 0.45 0.5 rg\n1 0 0 1 483 34 Tm\n(' + pdfEscape(footer) + ') Tj\nET\n',
    ].join('')
    const stream = encode(content)
    const contentId = pageIds[index] + 1
    objects.push(encode('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /ProcSet [/PDF /Text /ImageC] /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Logo 5 0 R >> >> /Contents ' + contentId + ' 0 R >>'))
    objects.push(concat([encode('<< /Length ' + stream.length + ' >>\nstream\n'), stream, encode('\nendstream')]))
  })
  const chunks: Uint8Array[] = [encode('%PDF-1.4\n')]
  const offsets = [0]
  let offset = chunks[0].length
  for (let i = 0; i < objects.length; i++) {
    offsets.push(offset)
    const part = concat([encode((i + 1) + ' 0 obj\n'), objects[i], encode('\nendobj\n')])
    chunks.push(part); offset += part.length
  }
  chunks.push(encode('xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n' +
    offsets.slice(1).map(position => String(position).padStart(10, '0') + ' 00000 n \n').join('') +
    'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + offset + '\n%%EOF\n'))
  return new Blob([concat(chunks)], { type: 'application/pdf' })
}
