import { useCallback, useEffect, useState } from 'react'
import {
  getRpcService,
  loadingState,
  type AsyncState,
  type FamilyPsychologyAppointment,
} from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date)
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export function FamilyPsychologyAppointmentsPanel({
  accessContext,
  startDate,
  endDate,
  professionalId,
  onChanged,
}: Readonly<{
  accessContext: AccessContext
  startDate: string
  endDate: string
  professionalId: string | null
  onChanged?: () => Promise<unknown>
}>) {
  const roleCodes = accessContext.roles.map((role) => role.code)
  const isGeneral = roleCodes.some((role) =>
    ['administrador', 'administrativo_operacional', 'coordenador'].includes(role),
  )
  const isPsychologyProfessional =
    roleCodes.includes('profissional') &&
    Boolean(accessContext.professional_id) &&
    (accessContext.specialties ?? []).some(
      (item) => normalize(item.specialty_name) === 'psicologia',
    )
  const authorized = isGeneral || isPsychologyProfessional

  const [state, setState] =
    useState<AsyncState<readonly FamilyPsychologyAppointment[]>>(loadingState)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [cancelId, setCancelId] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!authorized) {
      setState({ status: 'empty' })
      return
    }
    setState(loadingState())
    setState(
      await getRpcService().getFamilyPsychologyAppointments(
        startDate,
        endDate,
        isPsychologyProfessional ? accessContext.professional_id : professionalId,
      ),
    )
  }, [
    accessContext.professional_id,
    authorized,
    endDate,
    isPsychologyProfessional,
    professionalId,
    startDate,
  ])

  useEffect(() => {
    void load()
  }, [load])

  async function update(
    appointmentId: string,
    action: 'confirmado' | 'faltou' | 'cancelado',
    reason: string | null = null,
  ) {
    if (busyId) return
    setBusyId(appointmentId)
    setFeedback(null)
    const result = await getRpcService().updateFamilyPsychologyAttendance(
      appointmentId,
      action,
      reason,
      null,
    )
    if (result.status === 'success') {
      if (action === 'cancelado') {
        setCancelId('')
        setCancelReason('')
        setFeedback('Atendimento do familiar cancelado com motivo e auditoria preservados.')
      } else {
        setFeedback(
          action === 'confirmado'
            ? 'Presença do familiar confirmada.'
            : 'Falta do familiar registrada.',
        )
      }
      await load()
      await onChanged?.()
    } else {
      setFeedback(
        result.status === 'error'
          ? result.error.message
          : 'A atualização não retornou confirmação do banco.',
      )
    }
    setBusyId(null)
  }

  if (!authorized) return null

  const rows = state.status === 'success' ? state.data : []

  return (
    <section
      className="agenda-family-psychology"
      aria-labelledby="family-psychology-agenda-title"
    >
      <div className="agenda-section-heading">
        <div>
          <p className="eyebrow">Psicologia · Familiares</p>
          <h3 id="family-psychology-agenda-title">Atendimentos de familiares</h3>
          <p>
            Agenda vinculada à Fila de Familiares. O vínculo com o paciente é
            preservado, mas o atendimento pertence ao familiar.
          </p>
        </div>
      </div>

      {state.status === 'loading' && <p>Carregando atendimentos de familiares…</p>}
      {state.status === 'error' && (
        <p role="alert">{state.error.message}</p>
      )}
      {(state.status === 'empty' || rows.length === 0) && (
        <p>Nenhum atendimento de familiar neste período.</p>
      )}

      {rows.length > 0 && (
        <div className="assistential-table-wrap">
          <table className="assistential-table">
            <thead>
              <tr>
                <th>Data e hora</th>
                <th>Familiar</th>
                <th>Paciente vinculado</th>
                <th>Profissional</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const open = ['agendado', 'confirmado'].includes(
                  item.attendance_status,
                )
                return (
                  <tr key={item.appointment_id}>
                    <td>{formatDateTime(item.appointment_date)}</td>
                    <td>
                      {item.family_name}
                      <small className="agenda-patient-specialties">
                        {item.relationship}
                      </small>
                    </td>
                    <td>{item.source_patient_name ?? 'Vínculo protegido'}</td>
                    <td>{item.professional_name}</td>
                    <td>{item.attendance_status}</td>
                    <td className="agenda-attendance-actions">
                      {open && (
                        <>
                          {item.attendance_status === 'agendado' && (
                            <button
                              type="button"
                              disabled={busyId === item.appointment_id}
                              onClick={() =>
                                void update(item.appointment_id, 'confirmado')
                              }
                            >
                              ✓ Confirmar
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busyId === item.appointment_id}
                            onClick={() =>
                              void update(
                                item.appointment_id,
                                'faltou',
                                'Falta registrada na agenda do familiar.',
                              )
                            }
                          >
                            ✕ Falta
                          </button>
                          <button
                            type="button"
                            className="agenda-cancel-button"
                            disabled={busyId === item.appointment_id}
                            onClick={() => {
                              setCancelId(item.appointment_id)
                              setCancelReason('')
                              setFeedback(null)
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {cancelId && (
        <div className="agenda-cancel-panel">
          <div>
            <h4>Cancelar atendimento do familiar</h4>
            <p>O cancelamento exige motivo e não apaga o histórico.</p>
          </div>
          <label>
            Motivo do cancelamento *
            <textarea
              rows={2}
              minLength={5}
              maxLength={500}
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
            />
          </label>
          <div className="agenda-cancel-actions">
            <button
              type="button"
              className="agenda-cancel-confirm"
              disabled={busyId === cancelId || cancelReason.trim().length < 5}
              onClick={() =>
                void update(cancelId, 'cancelado', cancelReason.trim())
              }
            >
              Confirmar cancelamento
            </button>
            <button
              type="button"
              disabled={busyId === cancelId}
              onClick={() => {
                setCancelId('')
                setCancelReason('')
              }}
            >
              Manter atendimento
            </button>
          </div>
        </div>
      )}

      {feedback && <p role="status">{feedback}</p>}
    </section>
  )
}
