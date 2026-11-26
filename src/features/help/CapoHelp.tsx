import { useState } from 'react'
import { canAccessAppRoute } from '../../app/route-access'
import type { AccessContext } from '../../types/access'
import { TechnicalSupportRequest } from '../../components/forms/TechnicalSupportRequest'
import { findHelp } from './help-knowledge'
import './capo-help.css'

export function CapoHelp({accessContext, path}: {accessContext: AccessContext; path: string}) {
  const [open,setOpen]=useState(false)
  const [query,setQuery]=useState('')
  const [submitted,setSubmitted]=useState('')
  const [selected,setSelected]=useState('')
  const [resolved,setResolved]=useState(false)
  const [support,setSupport]=useState(false)
  const results=findHelp(accessContext,path,submitted)
  const topic=results.find(t=>t.id===selected)
  const supportAllowed=canAccessAppRoute(accessContext,'/suporte')
  const technicalAllowed=canAccessAppRoute(accessContext,'/tecnica')
  function reset() {setQuery('');setSubmitted('');setSelected('');setResolved(false);setSupport(false)}
  return <aside className="capo-help" aria-label="Assistente Virtual CAPO">
    {open && <section id="capo-help-panel" className="capo-help-panel" aria-label="Posso ajudar?">
      <header className="capo-help-header">
        <span aria-hidden="true">🌻</span><div><strong>Assistente CAPO</strong><small>Seu apoio dentro do sistema</small></div>
        <button type="button" aria-label="Minimizar assistente" onClick={()=>setOpen(false)}>−</button>
        <button type="button" aria-label="Fechar e limpar assistente" onClick={()=>{reset();setOpen(false)}}>×</button>
      </header>
      <div className="capo-help-body">
        <p className="capo-help-welcome"><strong>Olá! Posso ajudar?</strong><br/>Selecione um assunto ou descreva sua dificuldade. Não informe nomes de pacientes, dados clínicos ou senhas.</p>
        <small>Perfil: {accessContext.primary_context.name || 'Contexto atual'}</small>
        <form className="capo-help-search" onSubmit={e=>{e.preventDefault();setSubmitted(query.trim());setSelected('');setResolved(false);setSupport(false)}}>
          <label htmlFor="capo-help-query">Qual é sua dificuldade?</label>
          <div><input id="capo-help-query" maxLength={250} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: gerar PDF de transporte"/><button type="submit" disabled={!query.trim()}>Buscar</button></div>
        </form>
        {resolved ? <div role="status" className="capo-help-answer">Que bom que conseguiu resolver! Continue sua atividade. <button type="button" onClick={reset}>Nova dúvida</button></div> : <>
          {!support && !topic && <div className="capo-help-topics">
            <strong>{submitted?'Orientações encontradas':'Assuntos sugeridos'}</strong>
            {results.length===0 && <p role="status">Não encontrei uma orientação confiável. Tente outros termos ou solicite suporte.</p>}
            {results.slice(0,8).map(t=><button type="button" key={t.id} onClick={()=>{setSelected(t.id);setSupport(false)}}>{t.title} <span aria-hidden="true">›</span></button>)}
            {submitted && <button type="button" onClick={reset}>Ver todos os assuntos sugeridos</button>}
          </div>}
          {!support && topic && <div className="capo-help-answer" aria-live="polite">
            <strong>{topic.title}</strong>
            <ol>{topic.steps.map(step=><li key={step}>{step}</li>)}</ol>
            <small>Fonte: {topic.source}</small>
            {topic.route!==path && <p><a href={topic.route} target="_blank" rel="noopener noreferrer">Abrir módulo em outra aba</a> (preserva esta tela)</p>}
            <p>Conseguiu resolver sua dificuldade?</p>
            <div className="capo-help-actions"><button type="button" onClick={()=>setResolved(true)}>Sim, resolvido</button><button type="button" onClick={()=>setSupport(true)}>Não consegui</button><button type="button" onClick={()=>setSelected('')}>Outros assuntos</button></div>
          </div>}
          {!support && !topic && <button type="button" className="capo-help-support" onClick={()=>setSupport(true)}>Preciso de suporte técnico</button>}
          {support && <div className="capo-help-answer">
            <strong>Encaminhar dificuldade à manutenção</strong>
            <p>Revise o chamado antes de enviar. Não inclua dados pessoais, conteúdo clínico ou senhas.</p>
            <p>Perfil: {accessContext.primary_context.name || 'Contexto atual'} · Módulo: {path}</p>
            {supportAllowed ? <TechnicalSupportRequest key={path+'-'+selected} affectedModule={path} initialSubject={topic?.title || 'Dificuldade operacional'} initialDescription={'Perfil: '+(accessContext.primary_context.name || 'Contexto atual')+'. Módulo: '+path+'. '+(topic?'Orientação consultada: '+topic.title+'. ':'')+'Descreva a dificuldade sem dados pessoais: '} /> : technicalAllowed ? <a href="/tecnica" target="_blank" rel="noopener noreferrer">Abrir Painel Técnico em outra aba</a> : <p>Seu contexto não permite abrir chamados por este canal.</p>}
            <button type="button" onClick={()=>setSupport(false)}>Voltar à orientação</button>
          </div>}
        </>}
        <small className="capo-help-footer">Orientações internas CAPO • Sem IA externa</small>
      </div>
    </section>}
    <button className="capo-help-trigger" type="button" aria-expanded={open} aria-controls={open?'capo-help-panel':undefined} onClick={()=>setOpen(v=>!v)}><span aria-hidden="true">🌻</span> Posso ajudar?</button>
  </aside>
}
