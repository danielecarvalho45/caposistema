import { useEffect, useState } from 'react'
import {
  getRpcService,
  loadingState,
  type AsyncState,
  type BirthdayOverview,
} from '../../lib/supabase/rpc'
import type { AccessContext } from '../../types/access'
import { ProfileDashboard } from './ProfileDashboard'
import './home-page.css'

function normalized(value: string | null | undefined) {
  const cleanValue = value?.trim()
  return cleanValue || null
}

function pluralizeCapabilities(total: number) {
  return total === 1
    ? '1 permissão funcional reconhecida'
    : `${total} permissões funcionais reconhecidas`
}

type HomePageProps = Readonly<{
  accessContext: AccessContext
  loadBirthdays?: () => Promise<AsyncState<BirthdayOverview>>
}>

function formatDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day))
}

export function HomePage({
  accessContext,
  loadBirthdays = getRpcService().getBirthdays,
}: HomePageProps) {
  const [birthdays, setBirthdays] =
    useState<AsyncState<BirthdayOverview>>(loadingState())
  const displayName =
    normalized(accessContext.full_name) ?? accessContext.username
  const contextName =
    normalized(accessContext.primary_context.name) ?? 'Contexto autorizado'
  const functionTitle = normalized(accessContext.function_title)
  const primaryCode = normalized(accessContext.primary_context.code)
  const isAdministrativeOperational =
    primaryCode === 'administrativo_operacional'
  const canViewBirthdays = accessContext.roles.some((role) =>
    [
      'administrador',
      'administrativo_operacional',
      'coordenador',
      'profissional',
    ].includes(role.code),
  )

  useEffect(() => {
    if (!canViewBirthdays) return
    let active = true
    void loadBirthdays().then((state) => active && setBirthdays(state))
    return () => {
      active = false
    }
  }, [canViewBirthdays, loadBirthdays])

  return (
    <div className="home-page">
      <section className="home-welcome" aria-labelledby="home-title">
        <p className="eyebrow">Início</p>
        <h1 id="home-title">Olá, {displayName}</h1>
        <p>
          Seu acesso ao CAPO foi validado. Os módulos operacionais serão
          incorporados progressivamente a esta área de trabalho.
        </p>
        <p className="home-slogan">Acolher, cuidar e caminhar juntos.</p>
      </section>

      <ProfileDashboard accessContext={accessContext} />

      {canViewBirthdays && (
        <section className="home-birthdays" aria-labelledby="birthdays-title">
          <div className="home-birthdays-heading">
            <div>
              <p className="eyebrow">Hoje</p>
              <h2 id="birthdays-title">Aniversariantes de hoje</h2>
            </div>
            {birthdays.status === 'success' && (
              <span>{formatDateOnly(birthdays.data.reference_date)}</span>
            )}
          </div>

          {birthdays.status === 'loading' && (
            <p aria-live="polite">Carregando aniversariantes autorizados…</p>
          )}
          {birthdays.status === 'error' && (
            <p className="home-birthdays-error" role="alert">
              Não foi possível carregar os aniversariantes autorizados.
            </p>
          )}
          {birthdays.status === 'empty' && (
            <p>Nenhum aniversariante autorizado foi retornado.</p>
          )}
          {birthdays.status === 'success' && (
            <div className="home-birthday-grid">
              <article>
                <h3>Pacientes</h3>
                {birthdays.data.patients.length === 0 ? (
                  <p>Nenhum paciente acompanhado faz aniversário hoje.</p>
                ) : (
                  <ul>
                    {birthdays.data.patients.map((patient) => (
                      <li key={patient.patient_id}>
                        <strong>{patient.full_name}</strong>
                        {(patient.patient_number || patient.cms) && (
                          <small>
                            {patient.patient_number
                              ? `Nº CAPO ${patient.patient_number}`
                              : ''}
                            {patient.patient_number && patient.cms ? ' · ' : ''}
                            {patient.cms ? `CMS ${patient.cms}` : ''}
                          </small>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              <article>
                <h3>Equipe CAPO</h3>
                {birthdays.data.team.length === 0 ? (
                  <p>Nenhum integrante da equipe faz aniversário hoje.</p>
                ) : (
                  <ul>
                    {birthdays.data.team.map((member) => (
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
          <p className="home-birthdays-note">
            A lista respeita o contexto de acesso. Contato de aniversário não é
            liberado sem autorização registrada no backend.
          </p>
        </section>
      )}

      {isAdministrativeOperational && (
        <section className="home-ops" aria-labelledby="operational-panel-title">
          <div>
            <p className="eyebrow">Operacional</p>
            <h2 id="operational-panel-title">Painel Operacional</h2>
          </div>

          <div className="home-ops-grid">
            <article className="home-metric">
              <span className="home-metric-label">Contexto principal</span>
              <strong>{contextName}</strong>
            </article>
            <article className="home-metric">
              <span className="home-metric-label">Perfis ativos</span>
              <strong>{accessContext.roles.length}</strong>
            </article>
            <article className="home-metric">
              <span className="home-metric-label">Permissões</span>
              <strong>{accessContext.capabilities.length}</strong>
            </article>
          </div>

          <div className="home-capabilities">
            <h3>Permissões vigentes</h3>
            <ul>
              {accessContext.capabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="home-access" aria-labelledby="access-summary-title">
        <div>
          <p className="eyebrow">Acesso atual</p>
          <h2 id="access-summary-title">Resumo do seu contexto</h2>
        </div>

        <dl className="home-access-grid">
          <div>
            <dt>Contexto principal</dt>
            <dd>{contextName}</dd>
          </div>
          {functionTitle && (
            <div>
              <dt>Função</dt>
              <dd>{functionTitle}</dd>
            </div>
          )}
          <div>
            <dt>Perfis ativos</dt>
            <dd>{accessContext.roles.map((role) => role.name).join(', ')}</dd>
          </div>
          <div>
            <dt>Permissões</dt>
            <dd>{pluralizeCapabilities(accessContext.capabilities.length)}</dd>
          </div>
        </dl>

        <p className="home-access-note">
          A disponibilidade de cada módulo continuará sendo validada pelas
          regras de acesso do backend.
        </p>
      </section>
    </div>
  )
}
