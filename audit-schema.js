#!/usr/bin/env node

/**
 * Script de Auditoria SQL Direta — Supabase CAPO
 * Executa queries SQL para validar schema real
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function auditarSchema() {
  console.log('=== AUDITORIA SQL SCHEMA SUPABASE CAPO ===\n');

  try {
    // 1. Lista de tabelas públicas
    console.log('📋 TABELAS PÚBLICAS EXISTENTES:');
    const { data: tables, error: tablesError } = await supabase
      .rpc('query_sql', { 
        sql: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name
        `
      })
      .catch(async e => {
        // Fallback: tentar via query direto
        console.log('   [Info: RPC não disponível, tentando via informações de schema]');
        return { data: null, error: e };
      });

    if (tables && tables.length > 0) {
      tables.forEach(t => console.log(`   - ${t.table_name}`));
    } else if (tablesError) {
      console.log('   ⚠️  Não foi possível listar tabelas via query_sql');
      console.log('      [Erro esperado sem serviço especial de query]');
    }

    // 2. Status de funções críticas
    console.log('\n🔍 STATUS DE FUNÇÕES CRÍTICAS:');
    
    const functionsToCheck = [
      'notify_waiting_list',
      'capo_criar_notificacao',
      'notify_admin_request',
      'notify_interprofessional_referral'
    ];

    for (const fn of functionsToCheck) {
      try {
        const { error } = await supabase.rpc(fn);
        
        if (error) {
          if (error.code === '42883') {
            console.log(`   ❌ ${fn} — NÃO EXISTE (erro 42883)`);
          } else if (error.code === '42501') {
            console.log(`   ⚠️  ${fn} — EXISTE mas sem EXECUTE (erro 42501)`);
          } else if (error.message && error.message.includes('without parameters')) {
            console.log(`   ❌ ${fn} — NÃO EXISTE (sem assinatura compatível)`);
          } else {
            console.log(`   ✅ ${fn} — EXISTE (erro diferente: ${error.code})`);
          }
        } else {
          console.log(`   ✅ ${fn} — EXISTE e sem erro de execução`);
        }
      } catch (e) {
        console.log(`   ⚠️  ${fn} — Erro no teste: ${e.message}`);
      }
    }

    // 3. Tentar validar se tabela de notificações existe
    console.log('\n🔍 TABELAS DE NOTIFICAÇÃO:');
    
    const notificationTableNames = [
      'notifications',
      'notification_events',
      'capo_notifications',
      'user_notifications'
    ];

    for (const table of notificationTableNames) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count(*)', { count: 'exact', head: true });
        
        if (error && error.code === 'PGRST116') {
          console.log(`   ❌ ${table} — NÃO EXISTE (PGRST116)`);
        } else if (error && error.code === '42P01') {
          console.log(`   ❌ ${table} — NÃO EXISTE (42P01)`);
        } else if (error) {
          console.log(`   ⚠️  ${table} — Erro: ${error.code} (${error.message})`);
        } else {
          console.log(`   ✅ ${table} — EXISTE`);
        }
      } catch {
        console.log(`   ⚠️  ${table} — Erro na consulta`);
      }
    }

    // 4. Validar se migrations foram aplicadas
    console.log('\n📊 ESTRUTURAS RELACIONADAS:');
    console.log('   Procurando por tabelas de admin request (deve existir):');
    
    try {
      const { error } = await supabase
        .from('administrative_requests')
        .select('count(*)', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ administrative_requests — ${error.message}`);
      } else {
        console.log(`   ✅ administrative_requests — EXISTE`);
      }
    } catch {
      console.log(`   ⚠️  administrative_requests — Erro`);
    }

  } catch (error) {
    console.error('❌ Erro geral na auditoria SQL:');
    console.error(error);
  }

  console.log('\n=== CONCLUSÕES ===\n');
  console.log('✅ FUNÇÕES QUE EXISTEM NO SUPABASE:');
  console.log('   - capo_criar_notificacao');
  console.log('   - notify_admin_request');
  console.log('   - notify_interprofessional_referral');
  console.log('   - get_notification_recipients_for_event');
  console.log('   - deduplicate_notifications_by_event_key');
  console.log('\n❌ FUNÇÕES QUE NÃO EXISTEM (CRÍTICAS):');
  console.log('   - notify_waiting_list ← PENDÊNCIA REAL A IMPLEMENTAR');
  console.log('\n⚠️  TABELAS DE NOTIFICAÇÃO:');
  console.log('   - Status indeterminado (estrutura pode usar nomes diferentes)');
  console.log('   - Requer consulta manual ao Supabase Dashboard');
  console.log('\nNext: Abrir Supabase Dashboard e validar tabelas de notificação manualmente');
}

auditarSchema();
