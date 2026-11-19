import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ManualConfirmationCorrection } from '../../src/features/agenda/ManualConfirmationCorrection'

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../../src/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc: mocks.rpc }),
}))

afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Retificação auditável de confirmação manual do CAPO', () => {
  it('não permite salvar sem motivo e não altera consulta diretamente', async () => {
    const user = userEvent.setup()
    const onCorrected = vi.fn()
    render(<ManualConfirmationCorrection appointmentId="agendamento"
      patientName="Paciente" kind="patient" onCorrected={onCorrected} />)
    await user.click(screen.getByRole('button', { name: /Corrigir confirmação manual de Paciente/ }))
    expect(screen.getByRole('button', { name: 'Salvar correção' })).toBeDisabled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('registra motivo, resultado pendente e avisa a tela apenas após confirmação do banco', async () => {
    const user = userEvent.setup()
    const onCorrected = vi.fn()
    mocks.rpc.mockResolvedValue({ data: { success: true }, error: null })
    render(<ManualConfirmationCorrection appointmentId="agendamento"
      patientName="Paciente" kind="patient" onCorrected={onCorrected} />)
    await user.click(screen.getByRole('button', { name: /Corrigir confirmação manual de Paciente/ }))
    await user.type(screen.getByLabelText('Motivo obrigatório da correção'), 'Confirmação registrada por engano')
    await user.click(screen.getByRole('button', { name: 'Salvar correção' }))
    await waitFor(() => expect(onCorrected).toHaveBeenCalledWith('correcao_pendente'))
    expect(mocks.rpc).toHaveBeenCalledWith('correct_manual_previsit_confirmation_for_interface', {
      p_appointment_id: 'agendamento', p_kind: 'patient', p_result: 'pendente',
      p_reason: 'Confirmação registrada por engano',
    })
  })

  it('mantém o formulário aberto quando o banco nega a correção de familiar', async () => {
    const user = userEvent.setup()
    const onCorrected = vi.fn()
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Resposta pelo link já registrada.' } })
    render(<ManualConfirmationCorrection appointmentId="agendamento"
      patientName="Familiar" kind="family" onCorrected={onCorrected} />)
    await user.click(screen.getByRole('button', { name: /Corrigir confirmação manual de Familiar/ }))
    await user.selectOptions(screen.getByLabelText('Resultado correto'), 'avisado')
    await user.type(screen.getByLabelText('Motivo obrigatório da correção'), 'Contato não confirmado')
    await user.click(screen.getByRole('button', { name: 'Salvar correção' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Resposta pelo link já registrada.')
    expect(onCorrected).not.toHaveBeenCalled()
  })
})
