-- 23/11/2026 · CAPO · VERDE: manter avisos do retorno familiar sob responsabilidade do Administrativo.
-- Alteração aditiva: NÃO muda vínculo, fila inicial, primeira consulta ou dados reais.
create or replace function public.capo_notify_admin_on_professional_family_return()
returns trigger
language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $body$
begin
  if new.appointment_kind <> 'retorno'
     or auth.uid() is null
     or not public.has_app_role('profissional')
     or public.has_app_role('administrador')
     or public.has_app_role('administrativo_operacional')
  then
    return new;
  end if;

  perform public.capo_criar_notificacao(
    'administrativo_operacional',
    null,
    'family_psychology_return_notice',
    'Retorno de familiar — aviso pendente',
    'A Psicologia agendou retorno de Familiar/Cuidador em '
      || to_char(new.appointment_date at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI')
      || '. Abrir a agenda oficial para enviar o aviso de consulta e registrar o contato.',
    'family_psychology_appointment',
    new.id,
    'normal'
  );
  return new;
end;
$body$;

drop trigger if exists trg_capo_notify_admin_professional_family_return
  on public.family_psychology_appointments;
create trigger trg_capo_notify_admin_professional_family_return
  after insert on public.family_psychology_appointments
  for each row
  when (new.appointment_kind = 'retorno')
  execute function public.capo_notify_admin_on_professional_family_return();

revoke all on function public.capo_notify_admin_on_professional_family_return()
  from public, anon, authenticated;
