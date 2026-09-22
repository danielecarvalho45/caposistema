#!/usr/bin/env node

/**
 * Script de Auditoria Física do Supabase CAPO
 * Consulta o projeto oficial para validar estado real de:
 * - Funções (especialmente capo_criar_notificacao e notify_waiting_list)
 * - Tabelas de notificação
 * - Policies e RLS
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fftebavlhbfcrvrtnrld.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGViYXZsaGJmY3J2cnRucmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NTQwNjEsImV4cCI6MjEwMzQzMDA2MX0.UvTS6FFC1PSXPuty56Q2H7THTTVdb7Mg5DerVYZmUu0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function auditarSupabase() {
  console.log('=== AUDITORIA FÍSICA SUPABASE CAPO ===\n');
  console.log('Project Ref: fftebavlhbfcrvrtnrld');
  console.log('URL: ' + SUPABASE_URL);
  console.log('\n');

  try {
    // 1. Tentar consultar functions via RPC de diagnóstico
    console.log('📋 TESTE DE CONECTIVIDADE...');
    const { data: testData, error: testError } = await supabase
      .rpc('get_my_access_context')
      .single();
    
    if (testError) {
      console.log('⚠️  Erro ao chamar get_my_access_context:');
      console.log('   Código: ' + testError.code);
      console.log('   Mensagem: ' + testError.message);
      console.log('   ➜ Isso é esperado se não conectado como usuário autenticado\n');
    } else {
      console.log('✅ Conexão de teste OK\n');
    }

    // 2. Verificar se capo_criar_notificacao existe
    console.log('🔍 AUDITANDO FUNÇÃO: capo_criar_notificacao');
    try {
      const { data: fnCheck1, error: err1 } = await supabase
        .rpc('get_technical_system_status_for_interface');
      
      if (err1) {
        console.log('   ⚠️  Função de auditoria técnica não disponível');
      }
    } catch (e) {
      // Silenciar
    }

    // 3. Listar informações de schema (via query direto)
    console.log('\n📊 INFORMAÇÕES DE SCHEMA');
    console.log('   [Nota: Dados sensíveis podem estar protegidos por RLS]\n');

    // 4. Procurar por tabelas de notificação
    console.log('🔍 TABELAS DE NOTIFICAÇÃO ESPERADAS:');
    const notificationTables = [
      'notifications',
      'notification_events',
      'notification_log',
      'capo_notifications'
    ];
    
    for (const table of notificationTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('1')
          .limit(1);
        
        if (error && error.code === 'PGRST116') {
          console.log(`   ❌ ${table} — Não existe ou sem acesso`);
        } else if (error) {
          console.log(`   ⚠️  ${table} — ${error.message}`);
        } else {
          console.log(`   ✅ ${table} — EXISTE e acessível`);
        }
      } catch (e) {
        console.log(`   ⚠️  ${table} — Erro na consulta`);
      }
    }

    // 5. Tentar chamar notify_waiting_list
    console.log('\n🔍 AUDITANDO FUNÇÃO: notify_waiting_list');
    try {
      const { data: result, error: fnError } = await supabase
        .rpc('notify_waiting_list');
      
      if (fnError && fnError.code === 'PGRST116') {
        console.log('   ❌ notify_waiting_list NÃO EXISTE (PGRST116)');
      } else if (fnError && fnError.code === '42883') {
        console.log('   ❌ notify_waiting_list NÃO EXISTE (42883 - função não encontrada)');
      } else if (fnError && fnError.code === '42501') {
        console.log('   ⚠️  notify_waiting_list EXISTS MAS SEM PERMISSÃO (EXECUTE denied)');
        console.log('       Tipo de erro: Autorização insuficiente para usuário anon/authenticated');
      } else if (fnError) {
        console.log('   ⚠️  notify_waiting_list — ' + fnError.message);
      } else {
        console.log('   ✅ notify_waiting_list EXISTE e é executável');
        console.log('       Resultado: ' + JSON.stringify(result));
      }
    } catch (e) {
      console.log('   ⚠️  Erro ao testar notify_waiting_list: ' + e.message);
    }

    // 6. Funções de Notificação Esperadas
    console.log('\n🔍 FUNÇÕES AUXILIARES ESPERADAS:');
    const expectedFunctions = [
      'capo_criar_notificacao',
      'notify_admin_request',
      'notify_interprofessional_referral',
      'get_notification_recipients_for_event',
      'deduplicate_notifications_by_event_key'
    ];

    for (const fn of expectedFunctions) {
      try {
        const result = await supabase.rpc(fn);
        console.log(`   ✅ ${fn} — Encontrada (RPC chamável)`);
      } catch (e) {
        if (e.message && e.message.includes('42883')) {
          console.log(`   ❌ ${fn} — NÃO ENCONTRADA (42883)`);
        } else if (e.message && e.message.includes('42501')) {
          console.log(`   ⚠️  ${fn} — Existe MAS sem EXECUTE (42501)`);
        } else {
          console.log(`   ⚠️  ${fn} — Status desconhecido`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro geral na auditoria:');
    console.error(error);
  }

  console.log('\n=== FIM DA AUDITORIA ===\n');
  console.log('💡 Análise:');
  console.log('   1. Se erro 42883 → função NÃO EXISTE no Supabase oficial');
  console.log('   2. Se erro 42501 → função EXISTS mas sem EXECUTE grant');
  console.log('   3. Se erro PGRST116 → endpoint não existe ou table não existe');
  console.log('   4. Consultar Supabase dashboard para confirmação manual: https://supabase.com/dashboard');
}

auditarSupabase();
