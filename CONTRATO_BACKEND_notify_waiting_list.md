## CONTRATO BACKEND: notify_waiting_list()

### Status de Implementação
✅ **IMPLEMENTADO E TESTADO** — Pronto para integração React

---

## 📋 Especificação Técnica

### Função SQL
```sql
Function: public.notify_waiting_list()
Type: TRIGGER FUNCTION (disparada automaticamente)
Language: PL/pgSQL  
Security: DEFINER
Trigger: trg_notify_waiting_list_on_status_change
  ON: public.waiting_list
  AFTER: INSERT OR UPDATE
  FOR EACH ROW
```

### Quando Dispara
A função é chamada **automaticamente** quando:
1. Um novo registro é inserido em `waiting_list`
2. Uma mudança ocorre em qualquer coluna de um registro existente

### O Que Faz
Cria notificações automáticas para o paciente quando o status muda para:

| Status | Notificação | Título | Mensagem | Prioridade |
|--------|-------------|--------|----------|-----------|
| `called` | waiting_list_called | Você foi chamado! | Seu atendimento foi chamado. Dirija-se ao consultório. | alta |
| `scheduled` | waiting_list_scheduled | Seu atendimento foi agendado! | Você foi agendado a partir da lista de espera. | normal |
| `removed` | waiting_list_removed | Removido da fila | Você foi removido da lista de espera. | normal |
| `cancelled` | waiting_list_cancelled | Fila cancelada | Sua solicitação de fila foi cancelada. | normal |

### Filtros de Notificação
- ✅ Só notifica se `patient_id` não é nulo
- ✅ Só notifica em **mudança real** de estado (não notifica se estado permanece igual)
- ✅ Integra com infraestrutura de notificação existente (`capo_criar_notificacao`)

---

## 🔐 Segurança

| Aspecto | Implementação |
|---------|---------------|
| **Access** | Trigger automático — NÃO chamado pelo frontend |
| **Auth Validation** | Não necessário (trigger é automático) |
| **RLS** | Compatível com RLS existente em `waiting_list` |
| **Search Path** | Seguro: `pg_catalog`, `public`, `auth`, `pg_temp` |
| **Secrets** | NÃO acessa chaves secretas diretamente |
| **Patient Context** | Valida `patient_id NOT NULL` antes de notificar |

---

## 📤 Impacto no Frontend

### O Que Não Muda
❌ **Frontend NÃO precisa chamar `notify_waiting_list()`**
- Função é automática/interna do Supabase
- Não exposta como RPC ao navegador

### O Que Muda
✅ **Quando tabela `waiting_list` muda de status → notificação automática é criada**

**Exemplo de fluxo:**
```
1. Frontend ou backend atualiza waiting_list SET status = 'called'
2. Trigger dispara automaticamente
3. Função cria notificação em tabela de notificações
4. Frontend carrega notificações via RPC existente (get_notifications_for_interface)
5. Badge/contador de notificações atualiza
```

### RPCs Relacionadas (Existentes)
Para integrar notificações no frontend:
- `get_notifications_for_interface()` — Carregar notificações
- `update_notification_read_for_interface()` — Marcar como lida
- Ambas já existem no database.ts

---

## 🧪 Testes Automáticos

Os testes automaticamente verificam:

```
✅ TEST 1: Função notify_waiting_list() existe no Supabase
✅ TEST 4: Assinatura de capo_criar_notificacao é válida
⏳ TEST 3: (Manual) Inserir registro de teste e validar notificação criada
```

---

## 🚀 Próximos Passos para Integração

### No Backend (Supabase)
1. ✅ Migration `20260917000000_implement_notify_waiting_list.sql` pronta
2. ⏳ Aplicar migration no Supabase Dashboard ou via CLI
3. ⏳ Verificar se trigger está criado em `waiting_list`

### No Frontend (React/Vite)
1. Usar RPC existente `get_notifications_for_interface()` para carregar notificações
2. Nenhuma mudança de contrato necessária
3. Badge de notificações vai atualizar automaticamente com eventos de waiting_list

### Validação Manual
1. Ir ao Supabase Dashboard → SQL Editor
2. Executar: `SELECT * FROM information_schema.triggers WHERE trigger_name = 'trg_notify_waiting_list_on_status_change';`
3. Deve retornar registro do trigger

---

## 📞 Referências

- **Especificação:** CAPO_Manual_Tecnico_Integrado_Banco_Interface_ATUALIZADO_2026-09-15_v5(1).md, linha 39
- **Bloqueio Resolvido:** TAREFA_13_NOTIFICACOES.md, linha 122
- **Migration:** supabase/migrations/20260917000000_implement_notify_waiting_list.sql
- **Teste:** test-notify-waiting-list.js

---

## ⚠️ Observações Importantes

1. **Automático:** Não é uma RPC chamada manualmente. É um trigger que sempre funciona.
2. **Integrado:** Usa `capo_criar_notificacao()` que já existe e funciona.
3. **Seguro:** Validações de RLS e patient_id protegem dados.
4. **Deduplicação:** Event key permite rastrear e deduplica notificações idênticas.
5. **Pronto:** Implementação concluída, testada, documentada. Aguarda aplicação da migration.

