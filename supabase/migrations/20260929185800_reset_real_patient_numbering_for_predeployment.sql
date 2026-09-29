-- Pré-implantação: reinicia a numeração real de pacientes no primeiro cadastro real.
-- O paciente de homologação mantém seu identificador próprio TESTE-CAPO-0001.
-- Esta correção é protegida para executar somente quando existir exatamente 1 paciente real.

do $$
declare
  v_real_count integer;
  v_existing_000001 uuid;
  v_first_real uuid;
begin
  select count(*) into v_real_count
  from public.patients
  where coalesce(is_test,false)=false;

  if v_real_count <> 1 then
    raise exception 'Correção de pré-implantação exige exatamente 1 paciente real; encontrados %.', v_real_count;
  end if;

  select id into v_existing_000001
  from public.patients
  where patient_number='000001'
  limit 1;

  if v_existing_000001 is not null then
    raise exception 'Nº CAPO 000001 já está em uso.';
  end if;

  select id into v_first_real
  from public.patients
  where coalesce(is_test,false)=false
  order by created_at asc, id asc
  limit 1;

  update public.patients
     set patient_number='000001',
         updated_at=clock_timestamp()
   where id=v_first_real;

  perform setval('public.capo_patient_number_seq', 1, true);
end
$$;
