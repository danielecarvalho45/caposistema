import {
  CAPO_DOCUMENT_LOGO_HEIGHT, CAPO_DOCUMENT_LOGO_WIDTH, getCapoDocumentLogoJpeg,
} from './capo-document-brand'

// Diagramação exclusiva do PDF de solicitação de Transporte.
// Não altera os PDFs de encerramento ou o gerador institucional compartilhado.
export type TransportPdfData = Readonly<{
  patientName: string
  cms: string | null
  capoNumber: string | null
  phone?: string | null
  protocol?: string | null
  registeredAddress: string | null
  boardingAddress: string
  boardingSource: 'cadastro' | 'alternativo'
  vehicleType: 'carro' | 'ambulancia' | null
  periodicity: 'unica' | 'semanal' | 'quinzenal'
  reason: string
  requestedBy: string
  requestedByRole: string | null
  issuer: string
  appointmentLabel: string | null
  professionalName: string | null
  specialty: string | null
  careLocation: string | null
}>

const ink = '0.12 0.19 0.23'
const blue = '0.85 0.93 0.98'
const green = '0.88 0.95 0.86'
const pale = '0.95 0.98 0.97'
const darkBlue = '0.14 0.34 0.51'
const darkGreen = '0.16 0.36 0.26'
const usable = 468

function latin(value: string): string {
  return Array.from(value).map(c => c.charCodeAt(0) <= 255 ? c : ({
    '—': '-', '–': '-', '“': '"', '”': '"', '‘': "'", '’': "'", '•': '-',
  } as Record<string, string>)[c] ?? '?').join('')
}
function escaped(value: string): string {
  return latin(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
function asBytes(value: string) {
  return Uint8Array.from(Array.from(latin(value)).map(c => c.charCodeAt(0) & 255))
}
function concat(parts: readonly Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, b) => n + b.length, 0))
  let offset = 0
  for (const part of parts) { out.set(part, offset); offset += part.length }
  return out
}
function estimatedWidth(value: string, font: number, bold = false): number {
  return Array.from(latin(value)).reduce((sum, c) => {
    if (c === ' ') return sum + 0.28
    if (/[ilI1.,:;!]/.test(c)) return sum + 0.27
    if (/[MW@]/.test(c)) return sum + 0.8
    return sum + (bold ? 0.57 : 0.51)
  }, 0) * font
}
function splitText(value: string, font: number, maxWidth: number, bold = false): string[] {
  const lines: string[] = []
  for (const paragraph of value.split(/\r?\n/)) {
    if (!paragraph.trim()) { lines.push(''); continue }
    let line = ''
    for (const word of paragraph.trim().split(/\s+/)) {
      const combined = line ? line + ' ' + word : word
      if (line && estimatedWidth(combined, font, bold) > maxWidth) {
        lines.push(line)
        line = word
      } else { line = combined }
      // Não deixar uma palavra longa atravessar as margens.
      while (estimatedWidth(line, font, bold) > maxWidth) {
        let cut = 1
        while (cut < line.length && estimatedWidth(line.slice(0, cut + 1), font, bold) <= maxWidth) cut++
        lines.push(line.slice(0, cut))
        line = line.slice(cut)
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

export function buildTransportOfficialPdf(data: TransportPdfData): Blob {
  // Data da emissão real, capturada uma única vez e preservada em todas as páginas.
  const generatedAt = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).replace(',', ' às')
  const pages: string[][] = []
  let commands: string[] = []
  let cursor = 702

  const drawText = (value: string, x: number, y: number, size = 11, bold = false, color = ink, spacing = 0) => {
    commands.push('BT', '/' + (bold ? 'F2' : 'F1') + ' ' + size + ' Tf',
      color + ' rg', spacing.toFixed(3) + ' Tw',
      '1 0 0 1 ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' Tm',
      '(' + escaped(value) + ') Tj', '0 Tw', 'ET')
  }
  const band = (x: number, top: number, width: number, height: number, color: string) => {
    commands.push('q', color + ' rg',
      x + ' ' + (top - height).toFixed(2) + ' ' + width + ' ' + height + ' re f', 'Q')
  }
  const center = (value: string, y: number, size: number, bold = true, color = darkBlue) => {
    drawText(value, Math.max(46, (595 - estimatedWidth(value, size, bold)) / 2), y, size, bold, color)
  }
  const newPage = () => {
    if (commands.length) pages.push(commands)
    commands = []
    const logoHeight = 505 * CAPO_DOCUMENT_LOGO_HEIGHT / CAPO_DOCUMENT_LOGO_WIDTH
    commands.push('q', '505 0 0 ' + logoHeight.toFixed(2) + ' 45 748 cm', '/Logo Do', 'Q',
      '0.56 0.76 0.67 RG', '1 w', '45 743 m 550 743 l S')
    cursor = 708
  }
  const need = (points: number) => {
    if (cursor - points < 64) newPage()
  }
  const heading = (title: string, softGreen = false) => {
    need(47)
    cursor -= 13
    band(145, cursor, 305, 26, softGreen ? green : blue)
    center(title, cursor - 18, 12.6, true, softGreen ? darkGreen : darkBlue)
    cursor -= 35
  }
  const field = (label: string, value: string) => {
    const lines = splitText(value || 'Não informado', 10.5, 276)
    const height = Math.max(24, 7 + lines.length * 15)
    need(height + 4)
    band(55, cursor + 3, 186, height - 3, '0.92 0.96 0.98')
    drawText(label, 61, cursor - 12, 10.2, true)
    lines.forEach((line, i) => drawText(line, 248, cursor - 12 - i * 15, 10.5))
    commands.push('0.86 0.91 0.93 RG', '0.35 w',
      '55 ' + (cursor - height + 2).toFixed(2) + ' m 539 ' + (cursor - height + 2).toFixed(2) + ' l S')
    cursor -= height
  }
  const paragraph = (value: string, bold = false, highlight = false) => {
    const font = bold ? 10.7 : 11.4
    const lines = splitText(value, font, usable, bold)
    if (highlight && cursor - Math.min(lines.length, 5) * 17 > 64) {
      band(54, cursor + 9, 487, lines.length * 17 + 12, pale)
    }
    lines.forEach((line, index) => {
      need(18)
      const spaces = (line.match(/ /g) ?? []).length
      const remainder = usable - estimatedWidth(line, font, bold)
      const wordSpacing = !bold && index < lines.length - 1 && spaces
        ? Math.max(0, Math.min(3, remainder / spaces)) : 0
      drawText(line, 62, cursor - 2, font, bold, ink, wordSpacing)
      cursor -= 17
    })
  }
  newPage()
  band(45, cursor + 4, 505, 37, pale)
  center('SOLICITAÇÃO OFICIAL DE TRANSPORTE - CAPO', cursor - 21, 15, true)
  cursor -= 57
  drawText('Ao Setor de Transportes da Secretaria Municipal de Saúde.', 57, cursor, 11.2)
  cursor -= 13
  heading('IDENTIFICAÇÃO DO PACIENTE')
  field('Nome completo:', data.patientName)
  field('Número CAPO:', data.capoNumber ?? 'Não informado')
  field('Número CMS:', data.cms ?? 'Não informado')
  field('Telefone:', data.phone ?? 'Não informado')
  field('Protocolo:', data.protocol ?? 'Não informado')
  field('Endereço residencial:', data.registeredAddress ?? 'Não informado')

  heading('TRAJETO SOLICITADO', true)
  field('Local de embarque:', data.boardingSource === 'cadastro'
    ? 'Mesmo do endereço residencial cadastrado.' : data.boardingAddress)
  if (data.vehicleType) {
    field('Veículo solicitado:', data.vehicleType === 'ambulancia' ? 'AMBULÂNCIA' : 'CARRO')
  }
  if (data.appointmentLabel) {
    field('Data e horário da consulta:', data.appointmentLabel)
    field('Profissional:', data.professionalName ?? 'Não informado')
    field('Especialidade:', data.specialty ?? 'Não informada')
    field('Destino:', data.careLocation ?? 'Não informado')
  } else {
    field('Tipo de solicitação:', 'Sem consulta vinculada')
  }
  need(55)
  cursor -= 12
  band(120, cursor, 355, 34, blue)
  const cadence = data.periodicity === 'semanal' ? 'SEMANAL'
    : data.periodicity === 'quinzenal' ? 'QUINZENAL' : 'ÚNICA'
  center('PERIODICIDADE: ' + cadence, cursor - 23, 15, true, darkBlue)
  cursor -= 39

  heading('JUSTIFICATIVA DO TRANSPORTE', true)
  paragraph(data.reason.trim())
  cursor -= 7
  heading('SOLICITAÇÃO', true)
  paragraph('Solicitamos a disponibilização do transporte indicado para assegurar a continuidade do acompanhamento pelo CAPO.', true, true)
  cursor -= 17
  const authors: [string, string][] = [
    ['Transporte solicitado por:', data.requestedBy + (data.requestedByRole ? ' - ' + data.requestedByRole : '')],
    ['Documento gerado por:', data.issuer],
  ]
  for (const [label, value] of authors) {
    const labelWidth = estimatedWidth(label + ' ', 10.4, true)
    const values = splitText(value, 10.4, usable - labelWidth - 4)
    need(values.length * 16 + 8)
    drawText(label, 57, cursor, 10.4, true)
    values.forEach((line, index) => drawText(line, 57 + labelWidth + 4, cursor - index * 16, 10.4))
    cursor -= Math.max(26, values.length * 16 + 7)
  }
  pages.push(commands)

  const logo = getCapoDocumentLogoJpeg()
  const ids = pages.map((_, i) => 6 + 2 * i)
  const objects: Uint8Array[] = [
    asBytes('<< /Type /Catalog /Pages 2 0 R >>'),
    asBytes('<< /Type /Pages /Kids [' + ids.map(i => i + ' 0 R').join(' ') + '] /Count ' + pages.length + ' >>'),
    asBytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
    asBytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
    concat([asBytes('<< /Type /XObject /Subtype /Image /Width ' + CAPO_DOCUMENT_LOGO_WIDTH +
      ' /Height ' + CAPO_DOCUMENT_LOGO_HEIGHT +
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + logo.length +
      ' >>\nstream\n'), logo, asBytes('\nendstream')]),
  ]
  pages.forEach((pageCommands, i) => {
    // Rodapé fixo e discreto: à esquerda a data/hora de emissão, à direita a paginação.
    const footer = [
      'q', '0.80 0.89 0.89 RG', '0.5 w', '55 45 m 540 45 l S', 'Q',
      'BT', '/F1 9 Tf', darkBlue + ' rg',
      '1 0 0 1 57 29 Tm', '(' + escaped('Documento gerado em: ' + generatedAt) + ') Tj', 'ET',
      'BT', '/F1 9 Tf', darkBlue + ' rg',
      '1 0 0 1 478 29 Tm', '(' + escaped('Página ' + (i + 1) + ' de ' + pages.length) + ') Tj', 'ET',
    ]
    const content = asBytes([...pageCommands, ...footer].join('\n') + '\n')
    objects.push(asBytes('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /ProcSet [/PDF /Text /ImageC] /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Logo 5 0 R >> >> /Contents ' + (ids[i] + 1) + ' 0 R >>'))
    objects.push(concat([asBytes('<< /Length ' + content.length + ' >>\nstream\n'), content, asBytes('endstream')]))
  })
  const initial = asBytes('%PDF-1.4\n')
  const blocks: Uint8Array[] = [initial]
  const offsets: number[] = [0]
  let offset = initial.length
  objects.forEach((object, i) => {
    offsets.push(offset)
    const block = concat([asBytes((i + 1) + ' 0 obj\n'), object, asBytes('\nendobj\n')])
    blocks.push(block)
    offset += block.length
  })
  blocks.push(asBytes('xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n' +
    offsets.slice(1).map(value => String(value).padStart(10, '0') + ' 00000 n \n').join('') +
    'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' +
    offset + '\n%%EOF\n'))
  return new Blob([concat(blocks)], { type: 'application/pdf' })
}
