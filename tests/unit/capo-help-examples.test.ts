import { describe, expect, it } from 'vitest'
import { helpTopics } from '../../src/features/help/help-knowledge'
import { getHelpExamples } from '../../src/features/help/help-examples'
describe('Modelos visuais do Assistente CAPO',()=>{
  it('possui modelo estático para cada assunto cadastrado',()=>{
    for(const topic of helpTopics){
      const examples=getHelpExamples(topic.id)
      expect(examples.length,topic.id).toBeGreaterThan(0)
      expect(examples.every(page=>page.fields.length>0)).toBe(true)
    }
  })
  it('não inventa modelo para assunto não cadastrado',()=>{
    expect(getHelpExamples('inexistente')).toEqual([])
  })
  it('mostra solicitação, embarque e periodicidade do transporte',()=>{
    expect(getHelpExamples('transport-pdf').map(page=>page.title)).toEqual(['Solicitação de Transporte','Endereço de embarque','Periodicidade da consulta'])
  })
})
