import type { AccessContext } from '../../types/access'
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

export function HomePage({
  accessContext,
}: Readonly<{ accessContext: AccessContext }>) {
  const displayName =
    normalized(accessContext.full_name) ?? accessContext.username
  const contextName =
    normalized(accessContext.primary_context.name) ?? 'Contexto autorizado'
  const functionTitle = normalized(accessContext.function_title)

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
