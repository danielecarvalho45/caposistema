import { useCallback, useEffect, useState } from 'react'
import { PatientWhatsAppButton } from '../../components/contact/PatientWhatsAppButton'
import { getRpcService } from '../../lib/supabase/rpc'

type CareLocationNotice = Readonly<{
  notice_id: string
  patient_id: string
  patient_name: string
  professional_name: string
  appointment_date: string
  old_location: string | null
  new_location: string
}>

function notices(value: unknown): readonly CareLocationNotice[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
    const row = entry as Record<string, unknown>
    if (typeof row.notice_id !== 'string' || typeof row.patient_id !== 'string' ||
      typeof row.patient_name !== 'string' || typeof row.professional_name !== 'string' ||
      typeof row.appointment_date !== 'string' || typeof row.new_location !== 'string') return []
    return [{
      notice_id: row.notice_id, patient_id: row.patient_id,
      patient_name: row.patient_name, professional_name: row.professional_name,
      appointment_date: row.appointment_date,
      old_location: typeof row.old_location === 'string' ? row.old_location : null,
      new_location: row.new_location,
    }]
  })
}

function appointmentDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value :
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short',
    }).format(date)
}

export function CareLocationNotices() {
  const [items, setItems] = useState<readonly CareLocationNotice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const reload = useCallback(async () => {
    const result = await getRpcService().getPendingCareLocationChanges()
    setLoading(false)
    if (result.status === 'success') {
      setItems(notices(result.data))
      setError(null)
    } else if (result.status === 'empty') {
      setItems([])
      setError(null)
    } else if (result.status === 'error') {
      setError('Não foi possível consultar as mudanças de endereço.')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function confirmNotice(item: CareLocationNotice) {
    if (busyId || !window.confirm(
      `Confirma que o paciente ${item.patient_name} foi realmente avisado sobre o novo endereço e que a consulta deve ser atualizada?`,
    )) return
    setBusyId(item.notice_id)
    const result = await getRpcService().confirmCareLocationNotice(item.notice_id)
    setBusyId(null)
    if (result.status === 'success') {
      await reload()
    } else {
      setError('O banco não confirmou a comunicação. A pendência continua aberta.')
    }
  }

  if (!loading && !error && items.length === 0) return null

  return (
    <section className="gestor-panel" aria-label="Mudanças de local de atendimento"
      style={{ borderLeft: '4px solid #d97706', marginBottom: '1rem' }}>
      <h3>📍 Alteração de local de atendimento</h3>
      {loading && <p>Consultando avisos de mudança…</p>}
      {error && <p role="alert">{error}</p>}
      {items.length > 0 && (
        <>
          <p role="status">{items.length} consulta(s) precisam de comunicação sobre o novo endereço.</p>
          <button type="button" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Ocultar relação' : 'Ver pacientes e comunicar'}
          </button>
          {expanded && (
            <ul className="gestor-result-list">
              {items.map((item) => (
                <li key={item.notice_id}>
                  <strong>{item.patient_name}</strong>
                  <small>{item.professional_name} · {appointmentDate(item.appointment_date)}</small>
                  <small>Endereço anterior: {item.old_location ?? 'Não informado'}</small>
                  <small>Novo endereço: {item.new_location}</small>
                  <PatientWhatsAppButton
                    patientId={item.patient_id}
                    label="💬 Informar mudança de endereço"
                    message={`Olá, ${item.patient_name}! Informamos que o local do seu atendimento com ${item.professional_name}, marcado para ${appointmentDate(item.appointment_date)}, foi alterado. Novo endereço: ${item.new_location}. Qualquer dúvida ou necessidade de reagendamento, estamos à disposição por aqui. CAPO — Secretaria Municipal de Saúde de Pouso Alegre/MG.`}
                  />
                  <button type="button" disabled={busyId !== null}
                    onClick={() => void confirmNotice(item)}>
                    {busyId === item.notice_id ? 'Registrando…' : '✓ Registrar paciente avisado e atualizar consulta'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
