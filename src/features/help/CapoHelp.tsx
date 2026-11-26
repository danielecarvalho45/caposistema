import { useState } from 'react'
import { canAccessAppRoute } from '../../app/route-access'
import type { AccessContext } from '../../types/access'
import { TechnicalSupportRequest } from '../../components/forms/TechnicalSupportRequest'
import { findHelp } from './help-knowledge'
import { getHelpExamples } from './help-examples'
import './capo-help.css'

export function CapoHelp({accessContext, path}: {accessContext: AccessContext; path: string}) {
  const [open,setOpen]=useState(false)
  const [query,setQuery]=useState('')
  const [submitted,setSubmitted]=useState('')
  const [selected,setSelected]=useState('')
  const [resolved,setResolved]=useState(false)
  const [support,setSupport]=useState(false)
  const [exampleOpen,setExampleOpen]=useState(false)
  const [exampleLarge,setExampleLarge]=useState(false)
  function closeExample(){setExampleOpen(false);setExampleLarge(false)}
  const results=findHelp(accessContext,path,submitted)
  const topic=results.find(t=>t.id===selected)
  const examples=topic ? getHelpExamples(topic.id) : []
  const supportAllowed=canAccessAppRoute(accessContext,'/suporte')
  const technicalAllowed=canAccessAppRoute(accessContext,'/tecnica')
  function reset() {closeExample();setQuery('');setSubmitted('');setSelected('');setResolved(false);setSupport(false)}
  return <aside className="capo-help" aria-label="Assistente Virtual CAPO">
    {<section hidden={!open} style={!open ? {display: 'none'} : undefined} id="capo-help-panel" className="capo-help-panel" aria-label="Posso ajudar?">
      <header className="capo-help-header">
        <img className="capo-help-sunflower" src="/assets/capo-girassol-natural.svg" alt="" aria-hidden="true" width="32" height="42" /><div><strong>Assistente CAPO</strong><small>Seu apoio dentro do sistema</small></div>
        <button type="button" aria-label="Minimizar assistente" onClick={()=>setOpen(false)}>−</button>
        <button type="button" aria-label="Fechar e limpar assistente" onClick={()=>{reset();setOpen(false)}}>×</button>
      </header>
      <div className="capo-help-body">
        <p className="capo-help-welcome"><strong>Olá! Posso ajudar?</strong><br/>Selecione um assunto ou descreva sua dificuldade. Não informe nomes de pacientes, dados clínicos ou senhas.</p>
        <small>Perfil: {accessContext.primary_context.name || 'Contexto atual'}</small>
        <form className="capo-help-search" onSubmit={e=>{e.preventDefault();closeExample();setSubmitted(query.trim());setSelected('');setResolved(false);setSupport(false)}}>
          <label htmlFor="capo-help-query">Qual é sua dificuldade?</label>
          <div><input id="capo-help-query" maxLength={250} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Ex.: gerar PDF de transporte"/><button type="submit" disabled={!query.trim()}>Buscar</button></div>
        </form>
        {resolved ? <div role="status" className="capo-help-answer">Que bom que conseguiu resolver! Continue sua atividade. <button type="button" onClick={reset}>Nova dúvida</button></div> : <>
          {!support && !topic && <div className="capo-help-topics">
            <strong>{submitted?'Orientações encontradas':'Assuntos sugeridos'}</strong>
            {results.length===0 && <p role="status">Não encontrei uma orientação confiável. Tente outros termos ou solicite suporte.</p>}
            {results.map(t=><button type="button" key={t.id} onClick={()=>{closeExample();setSelected(t.id);setSupport(false)}}>{t.title} <span aria-hidden="true">›</span></button>)}
            {submitted && <button type="button" onClick={reset}>Limpar pesquisa e ver assuntos sugeridos</button>}
          </div>}
          {!support && topic && <div className="capo-help-answer" aria-live="polite">
            <strong>{topic.title}</strong>
            <ol>{topic.steps.map(step=><li key={step}>{step}</li>)}</ol>
            <small>Fonte: {topic.source}</small>
            {examples.length>0 && <button type="button" className="capo-help-example-trigger" aria-expanded={exampleOpen} onClick={()=>exampleOpen?closeExample():setExampleOpen(true)}>{exampleOpen?'Ocultar exemplo':'Visualizar exemplo preenchido'}</button>}
            {exampleOpen && examples.length>0 && <section className={'capo-help-example'+(exampleLarge?' capo-help-example-large':'')} aria-label="Exemplo ilustrativo preenchido">
              <div className="capo-help-example-toolbar"><strong>Modelo visual CAPO</strong><button type="button" aria-pressed={exampleLarge} onClick={()=>setExampleLarge(v=>!v)}>{exampleLarge?'Reduzir':'Ampliar'}</button><button type="button" onClick={closeExample}>Fechar exemplo</button></div>
              <p className="capo-help-example-warning">MODELO ILUSTRATIVO — DADOS FICTÍCIOS. Nenhuma ação grava informações.</p>
              {examples.map(page=><article className="capo-help-example-sheet" key={page.title}>
                <h3>{page.title}</h3>
                {page.fields.map(([label,value])=><div className="capo-help-example-field" key={label}><strong>{label}</strong><div>{value}</div></div>)}
                {page.action && <div className="capo-help-example-action">{page.action} (ilustrativo)</div>}
                {page.note && <p>{page.note}</p>}
              </article>)}
            </section>}
            <p>Conseguiu resolver sua dificuldade?</p>
            <div className="capo-help-actions"><button type="button" onClick={()=>{closeExample();setResolved(true)}}>Sim, resolvido</button><button type="button" onClick={()=>{closeExample();setSupport(true)}}>Não consegui</button><button type="button" onClick={()=>{closeExample();setSelected('')}}>Outros assuntos</button></div>
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
    <button className="capo-help-trigger" type="button" aria-expanded={open} aria-controls="capo-help-panel" onClick={()=>setOpen(v=>!v)}><img className="capo-help-sunflower" src="/assets/capo-girassol-natural.svg" alt="" aria-hidden="true" width="32" height="42" /> Posso ajudar?</button>
  </aside>
}
