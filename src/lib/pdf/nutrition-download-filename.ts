/** Nome local do download: usa exclusivamente a identificação do documento oficial. */
export function nutritionDownloadFilename(document: Readonly<Record<string, unknown>> | null): string {
  const clean = (value: unknown) => typeof value === 'string' || typeof value === 'number'
    ? String(value).normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/[. ]+$/g, '').toLocaleUpperCase('pt-BR')
    : ''
  const name = clean(document?.patient_name)
  const number = clean(document?.patient_number).replace(/^CAPO(?:\s*[-:]\s*|\s+|(?=\d))/, '')
  return 'PLANO ALIMENTAR - ' + (name || 'PACIENTE SEM NOME INFORMADO') + ' - CAPO ' + (number || 'NAO INFORMADO') + '.pdf'
}
