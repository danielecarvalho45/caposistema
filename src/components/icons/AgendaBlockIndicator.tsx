import { CapoIcon, type CapoIconName } from './CapoIcon'

const blockTypes: Readonly<Record<string, { label: string; icon: CapoIconName }>> = {
  intervalo: { label: 'Intervalo / Café', icon: 'coffee' },
  alimentacao: { label: 'Almoço', icon: 'meal' },
  estudo_caso: { label: 'Estudo de caso', icon: 'book' },
  atendimento_online: { label: 'Atendimentos online', icon: 'monitor' },
  rotina_administrativa: { label: 'Rotinas administrativas', icon: 'clipboard' },
  reuniao: { label: 'Reunião', icon: 'people' },
  relatorio: { label: 'Relatório', icon: 'chart' },
  atividade: { label: 'Atividade interna', icon: 'clipboard' },
  bloqueio: { label: 'Bloqueio', icon: 'block' },
}
export function agendaBlockText(value: string | null): string {
  return (value && blockTypes[value]?.label) || value || 'Bloqueado'
}
export function AgendaBlockIndicator({ type }: Readonly<{ type: string | null }>) {
  const info = type ? blockTypes[type] : undefined
  return <span className="capo-block-indicator">
    {info && <><CapoIcon name={info.icon} />{' '}</>}
    {agendaBlockText(type)}
  </span>
}
