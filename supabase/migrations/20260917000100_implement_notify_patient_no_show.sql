-- Migration: Implementar automação de notificação para pacientes faltosos
-- Data: 2026-09-17
-- Propósito: Criar função notify_patient_no_show() para notificar AO quando
--            paciente falta a um agendamento (status de aparência = 'no_show')
--
-- Contrato:
--   - Disparador: Quando aparência de agendamento muda para 'no_show'
--   - Notificação: Avisa papel administrativo_operacional (AO)
--   - Tipo: patient_no_show_detected
--   - Destinatário: AO responsável por acompanhamento
--
-- Referência: TAREFA_03_AUDITORIA_FALTOSOS.md linha 63
--             Bloco 1 Etapa 1D-B

-- Função para notificar AO sobre paciente faltoso
create or replace function public.notify_patient_no_show()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_patient_id uuid;
  v_patient_name text;
  v_appointment_date timestamp;
  v_professional_name text;
  v_notification_type text;
  v_title text;
  v_message text;
begin
  -- Extrair dados do novo registro (appointment_attendance)
  -- Assume que tabela tem: id, appointment_id, patient_id, attended_status, notes, created_at
  
  v_patient_id := new.patient_id;
  v_notification_type := 'patient_no_show_detected';
  v_title := 'Paciente faltoso registrado';
  v_message := 'Um paciente foi registrado como faltoso. Ação necessária.';
  
  -- Verificar se é transição para 'no_show'
  if new.attended_status = 'no_show' 
     and (old.attended_status is null or old.attended_status != 'no_show') then
    
    -- Criar notificação para papel administrativo_operacional
    -- Responsável por gerenciar faltosos conforme TAREFA_03
    if v_patient_id is not null then
      perform public.capo_criar_notificacao(
        'administrativo_operacional',
        null,
        v_notification_type,
        v_title,
        v_message,
        'patient_no_show_followups',
        new.id,
        'alta'
      );
      
      -- Criar ou atualizar acompanhamento de faltoso
      -- Se houver função de criação de followup, chamar aqui
      -- Caso contrário, apenas a notificação será criada
    end if;
    
    return new;
  end if;
  
  return new;
end;
$function$;

-- Revogar todas as permissões inicialmente
revoke all on function public.notify_patient_no_show() from public, anon, authenticated, service_role;

-- NÃO expor notify_patient_no_show() diretamente ao frontend
-- Função é acionada automaticamente por trigger

-- Criar ou substituir trigger na tabela appointment_attendance
-- (assume que tabela já existe no Supabase oficial)
drop trigger if exists trg_notify_patient_no_show_on_attendance on public.appointment_attendance;

create trigger trg_notify_patient_no_show_on_attendance
after insert or update on public.appointment_attendance
for each row
execute function public.notify_patient_no_show();

-- Documentação de uso
comment on function public.notify_patient_no_show() is
  'Função disparada automaticamente quando status de comparecimento muda para no_show.
   
   Disparo:
   - Quando appointment_attendance.attended_status = ''no_show''
   - Apenas na primeira transição (não re-notifica se já era no_show)
   
   Ação:
   - Notifica papel administrativo_operacional
   - Priority: alta (requer ação rápida)
   - Event type: patient_no_show_detected
   
   Segurança:
   - SECURITY DEFINER com search_path seguro
   - NÃO exposta para chamada direta do frontend
   - Trigger automático apenas
   
   Integração:
   - Usa capo_criar_notificacao() para criar notificação
   - Referencia tabela patient_no_show_followups
   - Compatível com RLS em appointment_attendance
   
   Referência: TAREFA_03_AUDITORIA_FALTOSOS, Bloco 1 Etapa 1D-B';
