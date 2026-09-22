import './capo-shell.css'

type CapoFooterProps = Readonly<{
  className?: string
}>

export function CapoFooter({ className = '' }: CapoFooterProps) {
  return (
    <footer className={`capo-footer ${className}`.trim()}>
      <div className="capo-footer-center">
        <strong>sistema CAPO — Gestão Administrativa e Operacional</strong>
        <span>
          Elaborado e desenvolvido por Daniele Cristina Silva de Carvalho —
          Auxiliar Administrativo do CAPO
        </span>
        <span>Secretaria Municipal de Saúde de Pouso Alegre – MG</span>
        <span>🔒 Ambiente restrito • Dados protegidos • Acesso individual e auditado • Uso exclusivo autorizado</span>
        <span className="capo-footer-privacy">🔒 Privacidade e Segurança</span>
      </div>
      <div className="capo-footer-right">
        <span>Tecnologia a serviço da vida.</span>
      </div>
    </footer>
  )
}