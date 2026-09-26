import { useEffect, useState } from 'react'
import { PatientWhatsAppButton } from '../contact/PatientWhatsAppButton'
import {
  getRpcService,
  loadingState,
  type AsyncState,
  type BirthdayOverview,
} from '../../lib/supabase/rpc'

type BirthdayPanelProps = Readonly<{
  title?: string
  className?: string
  loadBirthdays?: () => Promise<AsyncState<BirthdayOverview>>
  allowPatientWhatsApp?: boolean
}>

function formatReferenceDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day))
}

export function BirthdayPanel({
  title = 'Aniversariantes de hoje',
  className = '',
  loadBirthdays = getRpcService().getBirthdays,
  allowPatientWhatsApp = false,
}: BirthdayPanelProps) {
  const [state, setState] =
    useState<AsyncState<BirthdayOverview>>(loadingState())

  useEffect(() => {
    let active = true
    void loadBirthdays().then((result) => {
      if (active) setState(result)
    })
    return () => {
      active = false
    }
  }, [loadBirthdays])

  return (
    <section
      className={`home-profile capo-birthdays-panel ${className}`.trim()}
      aria-labelledby="capo-birthdays-title"
    >
      <div>
        <p className="eyebrow">Hoje</p>
        <h2 id="capo-birthdays-title">{title}</h2>
        {state.status === 'success' && (
          <span>{formatReferenceDate(state.data.reference_date)}</span>
        )}
      </div>

      {state.status === 'loading' && (
        <p aria-live="polite">Carregando aniversariantes autorizados…</p>
      )}
      {state.status === 'error' && (
        <p role="alert">Não foi possível carregar os aniversariantes autorizados.</p>
      )}
      {state.status === 'empty' && (
        <p>Nenhum aniversariante autorizado foi retornado.</p>
      )}

      {state.status === 'success' && (
        <div className="home-profile-grid">
          <article>
            <h3>Pacientes</h3>
            {state.data.patients.length === 0 ? (
              <p>Nenhum paciente acompanhado faz aniversário hoje.</p>
            ) : (
              <ul>
                {state.data.patients.map((patient) => (
                  <li key={patient.patient_id}>
                    <strong>{patient.full_name}</strong>
                    {(patient.patient_number || patient.cms) && (
                      <small>
                        {patient.patient_number ? `Nº CAPO ${patient.patient_number}` : ''}
                        {patient.patient_number && patient.cms ? ' · ' : ''}
                        {patient.cms ? `CMS ${patient.cms}` : ''}
                      </small>
                    )}
                    {allowPatientWhatsApp && (
                      <PatientWhatsAppButton
                        patientId={patient.patient_id}
                        message={`Olá, ${patient.full_name}. 🎉 A equipe do CAPO deseja a você um feliz aniversário, com saúde, alegria e bons momentos. Receba nosso carinho e nossos melhores votos!`}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article>
            <h3>Equipe CAPO</h3>
            {state.data.team.length === 0 ? (
              <p>Nenhum integrante da equipe faz aniversário hoje.</p>
            ) : (
              <ul>
                {state.data.team.map((member) => (
                  <li key={member.professional_id}>
                    <strong>{member.full_name}</strong>
                    <small>{member.function_title}</small>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}
    </section>
  )
}
