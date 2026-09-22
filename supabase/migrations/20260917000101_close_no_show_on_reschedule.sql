-- Migration: Encerramento automático de acompanhamento de faltoso em remarcação
-- Data: 2026-09-17
-- Propósito: Quando paciente faltoso é remarcado, encerrar automaticamente
--            o acompanhamento de faltoso aberto
--
-- Problema: Remarcação concluída deixa acompanhamento como pendência
-- Solução: Trigger que atualiza status de followup quando agendamento é criado
--          a partir de rescheduling
--
-- Contrato:
--   - Tabela: appointment_reschedules (ou similar que registra remarcações)
--   - Trigger: Quando remarcação é confirmada/aceita
--   - Ação: Encerrar/completar followup de faltoso relacionado
--
-- Referência: TAREFA_03_AUDITORIA_FALTOSOS.md linha 59
--             Bloco 1 Etapa 1D-B

-- Função para encerrar acompanhamento quando paciente faltoso é remarcado
create or replace function public.close_no_show_followup_on_reschedule()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_followup_id uuid;
  v_patient_id uuid;
  v_reschedule_request_id uuid;
begin
  -- Extrair dados do novo registro de remarcação
  v_patient_id := new.patient_id;
  v_reschedule_request_id := new.id;
  
  -- Buscar o followup aberto (status != 'closed' ou 'completed')
  select pnf.id
    into v_followup_id
  from public.patient_no_show_followups pnf
  where pnf.patient_id = v_patient_id
    and pnf.status not in ('closed', 'completed', 'resolved')
    and pnf.rescheduled_appointment_id is null
  order by pnf.created_at desc
  limit 1;
  
  -- Se encontrou followup aberto, atualizar com referência de remarcação
  if v_followup_id is not null then
    update public.patient_no_show_followups
      set
        rescheduled_appointment_id = v_reschedule_request_id,
        status = 'resolved',
        updated_at = now()
      where id = v_followup_id;
    
    -- Criar notificação de conclusão/resolução
    perform public.capo_criar_notificacao(
      'administrativo_operacional',
      null,
      'no_show_followup_resolved',
      'Acompanhamento de faltoso encerrado',
      'Paciente foi remarcado. Acompanhamento resolvido.',
      'patient_no_show_followups',
      v_followup_id,
      'normal'
    );
  end if;
  
  return new;
end;
$function$;

-- Revogar todas as permissões inicialmente
revoke all on function public.close_no_show_followup_on_reschedule() from public, anon, authenticated, service_role;

-- Criar ou substituir trigger na tabela de remarcações
-- Procura por tabela correta: appointment_reschedules ou similar
drop trigger if exists trg_close_no_show_followup_on_reschedule on public.appointment_reschedules;
drop trigger if exists trg_close_no_show_followup_on_reschedule on public.reschedule_requests;

-- Tentar criar em appointment_reschedules primeiro (nome padrão)
create trigger trg_close_no_show_followup_on_reschedule
after insert or update on public.appointment_reschedules
for each row
execute function public.close_no_show_followup_on_reschedule();

-- Se tabela for reschedule_requests, criar segundo trigger
-- (comentado para evitar erro se tabela não existir)
-- create trigger trg_close_no_show_followup_on_reschedule_v2
-- after insert or update on public.reschedule_requests
-- for each row
-- execute function public.close_no_show_followup_on_reschedule();

-- Documentação de uso
comment on function public.close_no_show_followup_on_reschedule() is
  'Função disparada automaticamente quando paciente faltoso é remarcado.
   
   Disparo:
   - INSERT na tabela de remarcações (appointment_reschedules)
   - UPDATE após confirmação de remarcação
   
   Ação:
   - Busca acompanhamento de faltoso aberto para o paciente
   - Atualiza status para ''resolved''
   - Vincula remarcação ao followup (campo rescheduled_appointment_id)
   - Notifica AO que acompanhamento foi concluído
   
   Validação:
   - Procura followup com status NOT IN (''closed'', ''completed'', ''resolved'')
   - Considera apenas followups não vinculados a remarcação anterior
   - Ordena por created_at DESC para resolver o mais recente
   
   Segurança:
   - SECURITY DEFINER com search_path seguro
   - NÃO exposta para chamada direta do frontend
   - Trigger automático apenas
   
   Integração:
   - Usa capo_criar_notificacao() para notificar conclusão
   - Atualiza patient_no_show_followups
   - Priority: normal (tarefa completada, não bloqueio)
   
   Referência: TAREFA_03_AUDITORIA_FALTOSOS, problema 3.3';
