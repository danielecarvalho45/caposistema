-- Migration: Auditoria de mudanças em patient_no_show_followups
-- Data: 2026-09-17
-- Propósito: Registrar todas as mudanças em acompanhamento de faltosos
--            para rastreabilidade operacional
--
-- Contrato:
--   - Tabela: patient_no_show_followups
--   - Trigger: AFTER INSERT, UPDATE, DELETE
--   - Ação: Registrar em audit_logs conforme padrão CAPO
--
-- Referência: TAREFA_03_AUDITORIA_FALTOSOS.md linha 3.5
--             Bloco 1 Etapa 1D-B

-- Criar trigger de auditoria em patient_no_show_followups
drop trigger if exists trg_audit_patient_no_show_followups on public.patient_no_show_followups;

create trigger trg_audit_patient_no_show_followups
after insert or update or delete on public.patient_no_show_followups
for each row
execute function public.capo_audit_trigger();

-- Documentação de uso
comment on trigger trg_audit_patient_no_show_followups on public.patient_no_show_followups is
  'Trigger de auditoria padrão CAPO para patient_no_show_followups.
   
   Registra:
   - Inserção de novo acompanhamento de faltoso
   - Atualização de status, contatos, resultados
   - Deleção (se ocorrer)
   
   Função: capo_audit_trigger() (padrão CAPO)
   - Registra em tabela audit_logs
   - Inclui auth.uid() do operador
   - Timestamps automáticos
   - Diferenças antes/depois
   
   Referência: TAREFA_03_AUDITORIA_FALTOSOS';
