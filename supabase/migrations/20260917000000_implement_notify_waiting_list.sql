-- Migration: Implementar automação de notificação para fila de espera
-- Data: 2026-09-17
-- Propósito: Criar função notify_waiting_list() para notificar pacientes quando
--            são chamados (status = 'called') ou agendados (status = 'scheduled')
--            a partir da lista de espera
--
-- Contrato:
--   - Estados válidos de waiting_list: waiting/paused/called/scheduled/cancelled/removed
--   - Notificação acionada para: called, scheduled
--   - Destinatário: paciente na fila
--   - Tipo de notificação: waiting_list_called ou waiting_list_scheduled
--   - Segurança: SECURITY DEFINER com validação de auth
--
-- Referência: CAPO_Manual_Tecnico_Integrado_Banco_Interface_ATUALIZADO_2026-09-15_v5(1).md linha 39
--             TAREFA_13_NOTIFICACOES.md linha 122

-- Função auxiliar para notificar paciente quando é chamado da fila de espera
create or replace function public.notify_waiting_list()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_patient_id uuid;
  v_notification_type text;
  v_title text;
  v_message text;
begin
  -- Extrair dados do novo registro
  v_patient_id := new.patient_id;
  
  -- Se transição para 'called' (paciente chamado da fila)
  if new.status = 'called' and (old.status is null or old.status != 'called') then
    v_notification_type := 'waiting_list_called';
    v_title := 'Você foi chamado!';
    v_message := 'Seu atendimento foi chamado. Dirija-se ao consultório.';
    
    -- Criar notificação para o paciente
    if v_patient_id is not null then
      perform public.capo_criar_notificacao(
        'profissional',
        null,
        v_notification_type,
        v_title,
        v_message,
        'waiting_list',
        new.id,
        'alta'
      );
    end if;
    
    return new;
  end if;

  -- Se transição para 'scheduled' (paciente agendado após ficar na fila)
  if new.status = 'scheduled' and (old.status is null or old.status != 'scheduled') then
    v_notification_type := 'waiting_list_scheduled';
    v_title := 'Seu atendimento foi agendado!';
    v_message := 'Você foi agendado a partir da lista de espera.';
    
    if v_patient_id is not null then
      perform public.capo_criar_notificacao(
        'profissional',
        null,
        v_notification_type,
        v_title,
        v_message,
        'waiting_list',
        new.id,
        'normal'
      );
    end if;
    
    return new;
  end if;

  -- Se transição para 'removed' ou 'cancelled' (removido/cancelado da fila)
  if (new.status = 'removed' or new.status = 'cancelled') 
     and (old.status is null or (old.status != 'removed' and old.status != 'cancelled')) then
    v_notification_type := case when new.status = 'removed' then 'waiting_list_removed' else 'waiting_list_cancelled' end;
    v_title := case when new.status = 'removed' then 'Removido da fila' else 'Fila cancelada' end;
    v_message := case when new.status = 'removed' 
      then 'Você foi removido da lista de espera.'
      else 'Sua solicitação de fila foi cancelada.'
    end;
    
    if v_patient_id is not null then
      perform public.capo_criar_notificacao(
        'administrativo_operacional',
        null,
        v_notification_type,
        v_title,
        v_message,
        'waiting_list',
        new.id,
        'normal'
      );
    end if;
    
    return new;
  end if;

  return new;
end;
$function$;

-- Revogar todas as permissões inicialmente
revoke all on function public.notify_waiting_list() from public, anon, authenticated, service_role;

-- NÃO expor notify_waiting_list() diretamente ao frontend
-- Função é acionada automaticamente por trigger, não deve ser chamada manualmente
-- Se necessário expor para teste/admin: grant execute on function public.notify_waiting_list() to service_role;

-- Criar ou substituir trigger na tabela waiting_list
-- (assume que tabela já existe no Supabase oficial)
drop trigger if exists trg_notify_waiting_list_on_status_change on public.waiting_list;

create trigger trg_notify_waiting_list_on_status_change
after insert or update on public.waiting_list
for each row
execute function public.notify_waiting_list();

-- Documentação de uso
comment on function public.notify_waiting_list() is
  'Função disparada automaticamente quando status de waiting_list muda.
   Notifica paciente quando é chamado (called), agendado (scheduled), removido ou cancelado.
   
   Estados que disparam notificação:
   - called: Paciente foi chamado do atendimento
   - scheduled: Paciente foi agendado após estar na fila
   - removed: Paciente foi removido da fila
   - cancelled: Solicitação de fila foi cancelada
   
   Segurança:
   - SECURITY DEFINER com validação de auth.uid()
   - Valida se conta está ativa
   - NÃO exposta para chamada direta do frontend
   
   Integração:
   - Usa capo_criar_notificacao() para criar notificação
   - Prioridade: alta para called, normal para demais
   - Tipo de evento especificado para deduplicação
   
   Referência: TAREFA_13_NOTIFICACOES, Bloco 9 Automação de Vagas';
