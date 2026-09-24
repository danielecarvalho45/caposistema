import { useState } from 'react'
import { getRpcService, type AsyncState } from '../../lib/supabase/rpc'

export type TechnicalSupportService = Readonly<{
  create: (input: {
    subject: string
    category: string
    description: string
    priority: string
    affectedModule: string
  }) => Promise<AsyncState<unknown>>
}>

export function createTechnicalSupportService(): TechnicalSupportService {
  return { create: (input) => getRpcService().createTechnicalSupportRequest(input) }
}

export function TechnicalSupportRequest({
  affectedModule,
  service = createTechnicalSupportService(),
}: Readonly<{ affectedModule: string; service?: TechnicalSupportService }>) {
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('normal')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (subject.trim().length < 3 || !category || description.trim().length < 5) {
      setFeedback('Informe assunto, categoria e descrição para enviar o chamado.')
      return
    }
    setBusy(true)
    setFeedback(null)
    const result = await service.create({
      subject: subject.trim(),
      category,
      description: description.trim(),
      priority,
      affectedModule,
    })
    setBusy(false)
    if (result.status !== 'success') {
      setFeedback(result.status === 'error' ? result.error.message : 'O chamado não retornou confirmação.')
      return
    }
    setSubject('')
    setCategory('')
    setDescription('')
    setPriority('normal')
    setFeedback('Chamado registrado. Acompanhe os avisos do CAPO para atualizações.')
  }

  return (
    <form onSubmit={(event) => void submit(event)}>
      <label>Assunto<input value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
      <label>Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Selecione</option><option value="acesso">Acesso</option><option value="erro">Erro</option><option value="orientacao">Orientação</option><option value="infraestrutura">Infraestrutura</option></select></label>
      <label>Prioridade<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option></select></label>
      <label>Descrição<textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      <button type="submit" disabled={busy}>{busy ? 'Enviando...' : 'Solicitar suporte'}</button>
      {feedback && <p role="status">{feedback}</p>}
    </form>
  )
}
