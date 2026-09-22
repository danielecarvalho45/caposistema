import type { AccessContext } from '../../types/access'

export function ProfilePage({
  accessContext,
}: Readonly<{ accessContext: AccessContext }>) {
  return (
    <section className="home-page" aria-labelledby="profile-title">
      <header className="home-welcome">
        <p className="eyebrow">Conta</p>
        <h1 id="profile-title">Perfil</h1>
        <p>Contexto da conta e capacidades atribuídas.</p>
      </header>
      <section className="home-profile" aria-label="Dados do perfil">
        <dl className="technical-profile-list">
          <div><dt>Usuário</dt><dd>{accessContext.username}</dd></div>
          <div><dt>Nome</dt><dd>{accessContext.full_name ?? 'Não informado'}</dd></div>
          <div><dt>Função</dt><dd>{accessContext.function_title ?? 'Não informado'}</dd></div>
          <div><dt>Contexto principal</dt><dd>{accessContext.primary_context.name ?? accessContext.primary_context.code ?? 'Não informado'}</dd></div>
          <div><dt>Papéis</dt><dd>{accessContext.roles.map((role) => role.name).join(' · ') || 'Nenhum papel'}</dd></div>
          <div><dt>Capacidades</dt><dd>{accessContext.capabilities.join(' · ') || 'Nenhuma capacidade adicional'}</dd></div>
          <div><dt>Situação da conta</dt><dd>{accessContext.is_active ? 'Ativa' : 'Inativa'}</dd></div>
        </dl>
      </section>
    </section>
  )
}
