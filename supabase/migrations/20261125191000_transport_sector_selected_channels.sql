-- Persistir os canais marcados no cadastro do Setor de Transporte, isolados por ambiente.
alter table public.transport_sector_contacts
  add column if not exists selected_channels text[] not null default array[]::text[];
alter table public.transport_sector_contacts
  drop constraint if exists transport_sector_contacts_selected_channels_check;
alter table public.transport_sector_contacts
  add constraint transport_sector_contacts_selected_channels_check
  check (selected_channels <@ array['whatsapp_primary','phone_responsible','email']::text[]);

create or replace function public.get_transport_sector_contacts_for_interface()
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare v_row public.transport_sector_contacts%rowtype; v_slot smallint;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(), false)
     or not exists(select 1 from public.user_accounts u where u.auth_user_id=auth.uid() and u.is_active = true)
     or not (public.has_app_role('administrador') or public.has_app_role('administrativo_operacional')
       or (public.has_app_role('profissional') and exists(
         select 1 from public.user_accounts ua
         join public.get_effective_professional_capabilities(ua.professional_id) c on true
         where ua.auth_user_id=auth.uid() and c.capability_code='preencher_solicitacao_transporte'
       ))) then
    raise exception 'Sem autorização para consultar contatos do Transporte.' using errcode='42501';
  end if;
  select case when u.is_homologation_account then 2 else 1 end into v_slot
    from public.user_accounts u where u.auth_user_id=auth.uid() and u.is_active=true limit 1;
  select * into v_row from public.transport_sector_contacts where slot=v_slot;
  return jsonb_build_object('whatsapp_primary',v_row.whatsapp_primary,
    'phone_responsible',v_row.phone_responsible,'email',v_row.email,
    'selected_channels',coalesce(v_row.selected_channels,array[]::text[]));
end; $function$;

create or replace function public.set_transport_sector_channels_for_interface(p_channels text[])
returns jsonb language plpgsql security definer
set search_path to 'pg_catalog','public','auth','pg_temp'
as $function$
declare
  v_user uuid;
  v_slot smallint;
  v_channels text[];
  v_contacts public.transport_sector_contacts%rowtype;
begin
  if auth.uid() is null or not coalesce(public.has_accepted_current_legal_term(),false)
     or not public.has_app_role('administrador') then
    raise exception 'Somente o Gestor/Titular pode atualizar os canais do Transporte.' using errcode='42501';
  end if;
  select id, case when is_homologation_account then 2 else 1 end
    into v_user,v_slot from public.user_accounts
    where auth_user_id=auth.uid() and is_active limit 1;
  if v_user is null then raise exception 'Conta inativa.' using errcode='42501'; end if;
  if p_channels is null or array_position(p_channels,null) is not null
     or not (p_channels <@ array['whatsapp_primary','phone_responsible','email']::text[]) then
    raise exception 'Seleção de destinatários inválida.' using errcode='22023';
  end if;
  select * into v_contacts from public.transport_sector_contacts where slot=v_slot for update;
  v_channels:=array(select distinct unnest(p_channels) order by 1);
  if ('whatsapp_primary'=any(v_channels) and nullif(v_contacts.whatsapp_primary,'') is null)
    or ('phone_responsible'=any(v_channels) and nullif(v_contacts.phone_responsible,'') is null)
    or ('email'=any(v_channels) and nullif(v_contacts.email,'') is null) then
    raise exception 'Cadastre o contato antes de marcar seu canal.' using errcode='22023';
  end if;
  update public.transport_sector_contacts set selected_channels=v_channels,
    updated_by=v_user, updated_at=clock_timestamp() where slot=v_slot;
  return jsonb_build_object('selected_channels',v_channels);
end; $function$;

revoke all on function public.set_transport_sector_channels_for_interface(text[]) from public,anon;
grant execute on function public.set_transport_sector_channels_for_interface(text[]) to authenticated;
