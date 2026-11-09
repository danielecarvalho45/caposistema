-- Correção restrita: em PostgREST moderno, o papel vem do JSON de claims.
-- Permanece proibido executar estas RPCs com anon ou authenticated.
do $capo_fix$
declare
  v_name text;
  v_definition text;
  v_old text := 'current_setting(''request.jwt.claim.role'',true)';
  v_new text := '(auth.jwt()->>''role'')';
begin
  foreach v_name in array array[
    'read_appointment_confirmation_link',
    'respond_appointment_confirmation_link'
  ] loop
    select pg_get_functiondef(p.oid) into v_definition
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=v_name;
    if v_definition is null or
       length(v_definition)-length(replace(v_definition,v_old,''))<>length(v_old) then
      raise exception 'A definição de % mudou; nenhuma permissão foi alterada.',v_name;
    end if;
    execute replace(v_definition,v_old,v_new);
  end loop;
end
$capo_fix$;
