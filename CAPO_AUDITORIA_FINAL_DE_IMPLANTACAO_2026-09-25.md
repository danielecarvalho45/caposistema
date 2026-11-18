
---

## 18/11/2026 — Encerramento da implementação de Notificações e Solicitações; manutenção pontual somente sob ocorrência

**Determinação expressa da Titular após verificação na interface:** a readequação visual e a implantação das funções de **Notificações e Solicitações** foram verificadas. A Titular decidiu **ENCERRAR A FRENTE DE MANUTENÇÃO E IMPLEMENTAÇÃO** dessas funções. A análise definitiva do comportamento, incluindo as transições de estados, recepção pelos destinatários, confirmações por link/manual, solicitações profissionais, feedback e histórico, **somente será comprovada quando os fluxos forem utilizados em situações reais**. Não presumir homologação funcional integral a partir da verificação da apresentação.

**Regra de governança a partir desta decisão:**
1. Preservar os componentes e regras implantados. Não iniciar novas reestruturações, adições de funções, refatorações, ajustes preventivos ou novas implementações de Notificações e Solicitações.
2. Manutenção futura exclusivamente **pontual/cirúrgica**, motivada por ocorrência concreta constatada no uso real, precedida de investigação documental, GitHub e Supabase; nenhuma intervenção sem novo **VERDE** específico da Titular.
3. Manter o fluxo compartilhado do Gestor/Titular e Administrativo Operacional; `Notificações gerais` e `Confirmações de agendamento` separados; solicitações de profissionais direcionadas ao módulo `/solicitacoes`, onde são aceitas, executadas e concluídas; leitura de aviso não substitui execução da demanda; confirmação prévia pelo link/manual não é presença profissional; histórico e auditoria preservados.
4. Preservar separação entre dados reais e `manuteste`, permissões, módulos de óbito/luto e bloqueio de agenda congelados. Não usar registros fictícios no ambiente real para antecipar homologação.
5. **Pendências técnicas identificadas anteriormente, não homologadas nem consideradas resolvidas por este encerramento:** (a) gatilho `trg_capo_resolve_intake_notification_on_request_status` pode fechar aviso de entrada da solicitação já no aceite, antes da conclusão da demanda; (b) `read_at` compartilhado entre destinatários de notificações por papel pode afetar leitura de outro usuário; (c) confirmar no uso real o feedback ao profissional e o comportamento das confirmações/manual/link, incluindo familiar/cuidador. Essas pendências ficam **registradas para observação, não autorizam manutenção proativa**. Se se manifestarem como defeito operacional, reabrir exclusivamente o item afetado mediante VERDE e registrar resultados.
6. Verificação de interface declarada pela Titular não equivale a testes automatizados executados ou confirmação individual em todos os perfis, navegadores e cenários.

**Situação oficial:** **IMPLEMENTAÇÃO E MANUTENÇÃO DE NOTIFICAÇÕES E SOLICITAÇÕES ENCERRADAS POR DECISÃO DA TITULAR; ESTRUTURA PRESERVADA; COMPORTAMENTO EM ACOMPANHAMENTO NO USO REAL; REABERTURA SOMENTE PARA CORREÇÃO PONTUAL DE ERRO COM NOVO VERDE.** Nenhuma alteração de código funcional ou banco de dados realizada neste registro documental.
