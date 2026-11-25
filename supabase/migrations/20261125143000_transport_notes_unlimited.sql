-- CAPO 25/11/2026. VERDE: justificativa de Transporte sem limite artificial.
-- Mantém o mínimo de cinco caracteres; apenas três funções instaladas, sem mudar ACL.
DO $capo_transport_notes$
DECLARE
  v_sig text;
  v_before text;
  v_after text;
  v_old text;
  v_new text;
BEGIN
  FOR v_sig, v_old, v_new IN
    SELECT * FROM (VALUES
      (
        'public.create_transport_request_for_interface(uuid,uuid,text)',
        $old1$if length(btrim(coalesce(p_transport_notes,''))) not between 5 and 500 then raise exception 'O motivo do transporte deve possuir entre 5 e 500 caracteres.'; end if;$old1$,
        $new1$if length(btrim(coalesce(p_transport_notes,''))) < 5 then raise exception 'O motivo do transporte deve possuir pelo menos 5 caracteres.'; end if;$new1$
      ),
      (
        'public.manage_transport_request_for_interface(uuid,text,text,text,text,text)',
        $old2$if length(btrim(coalesce(p_transport_notes,''))) not between 5 and 500 then
      raise exception 'O motivo operacional corrigido deve possuir entre 5 e 500 caracteres.' using errcode='22023';
    end if;$old2$,
        $new2$if length(btrim(coalesce(p_transport_notes,''))) < 5 then
      raise exception 'O motivo operacional corrigido deve possuir pelo menos 5 caracteres.' using errcode='22023';
    end if;$new2$
      ),
      (
        'public.capo_validate_transport_request()',
        $old3$  if length(new.transport_notes) > 500 then
    raise exception 'O motivo da solicitação deve possuir no máximo 500 caracteres.';
  end if;
$old3$,
        $new3$$new3$
      )
    ) AS edits(signature, old_text, new_text)
  LOOP
    SELECT pg_get_functiondef(to_regprocedure(v_sig)) INTO v_before;
    IF v_before IS NULL THEN RAISE EXCEPTION 'CAPO: função ausente: %',v_sig; END IF;
    IF strpos(v_before,v_old)=0 THEN RAISE EXCEPTION 'CAPO: validação não encontrada: %',v_sig; END IF;
    v_after := replace(v_before,v_old,v_new);
    EXECUTE v_after;
  END LOOP;
END $capo_transport_notes$;
