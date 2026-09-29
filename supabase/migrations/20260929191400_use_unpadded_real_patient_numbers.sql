-- Pré-implantação: Nº CAPO real em sequência numérica simples, sem zeros à esquerda.
-- Exemplo: 1, 2, 3, ..., 10, 11, ..., 20.

begin;

do $$
declare
  v_real_count integer;
begin
  select count(*) into v_real_count
  from public.patients
  where coalesce(is_test,false)=false;

  if v_real_count <> 1 then
    raise exception 'Ajuste inicial exige exatamente 1 paciente real; encontrados %.', v_real_count;
  end if;

  if exists (
    select 1 from public.patients
    where patient_number='1'
      and coalesce(is_test,false)=false
  ) then
    raise exception 'Nº CAPO 1 já está em uso.';
  end if;

  update public.patients
     set patient_number='1',
         updated_at=clock_timestamp()
   where coalesce(is_test,false)=false
     and patient_number='000001';

  if not found then
    raise exception 'Primeiro paciente real com Nº CAPO 000001 não encontrado.';
  end if;
end
$$;

create or replace function public.capo_generate_patient_number()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if new.patient_number is null or btrim(new.patient_number) = '' then
    new.patient_number := nextval('public.capo_patient_number_seq')::text;
  end if;

  return new;
end;
$function$;

select setval('public.capo_patient_number_seq', 1, true);

commit;
