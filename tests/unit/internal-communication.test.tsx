import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccessContext } from '../../src/types/access'
import { InternalCommunicationPage } from '../../src/features/communication/InternalCommunicationPage'
import { canAccessAppRoute } from '../../src/app/route-access'
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getUser: vi.fn() }))
vi.mock('../../src/lib/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc: mocks.rpc, auth: { getUser: mocks.getUser } }),
}))
const admin = { is_active: true, roles: [{ code: 'administrador', name: 'Gestor' }], professional_id: null } as AccessContext
const operational = { ...admin, roles: [{ code: 'administrativo_operacional', name: 'Administrativo' }] } as AccessContext
const professional = { ...admin, professional_id: 'p-1', roles: [{ code: 'profissional', name: 'Profissional' }] } as AccessContext
const outsider = { ...admin, roles: [{ code: 'administrador_tecnico', name: 'Manutenção' }] } as AccessContext
beforeEach(() => {
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === 'get_my_internal_communication_identity_for_interface')
      return { data: { account_id: 'account-1' }, error: null }
    if (name === 'get_internal_communication_recipients_for_interface')
      return { data: [
        { account_id: 'account-2', name: 'Profissional de teste', function_title: 'Clínico', can_receive_admin_demand: true },
        { account_id: 'account-3', name: 'Administrativo de teste', function_title: 'Administrativo', can_receive_admin_demand: false },
      ], error: null }
    if (name === 'get_internal_communications_for_interface') return { data: [], error: null }
    if (name === 'create_internal_communication_for_interface') return { data: { success: true, created: 1 }, error: null }
    return { data: { success: true }, error: null }
  })
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Comunicação interna isolada do módulo Solicitações', () => {
  it('exibe a nova rota para Gestor, Operacional e profissional, negando TI', () => {
    expect(canAccessAppRoute(admin, '/comunicacao')).toBe(true)
    expect(canAccessAppRoute(operational, '/comunicacao')).toBe(true)
    expect(canAccessAppRoute(professional, '/comunicacao')).toBe(true)
    expect(canAccessAppRoute(outsider, '/comunicacao')).toBe(false)
  })
  it('gestor pode enviar demanda e só lista profissionais aptos ao escolher esse tipo', async () => {
    render(<InternalCommunicationPage accessContext={admin} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nova mensagem' }))
    await screen.findByText('Profissional de teste')
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'demanda_administrativa' } })
    expect(screen.getByText('Profissional de teste')).toBeVisible()
    expect(screen.queryByText('Administrativo de teste')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('Assunto'), { target: { value: 'Verificar encaixe' } })
    fireEvent.change(screen.getByLabelText('Mensagem'), { target: { value: 'Favor avaliar a disponibilidade.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar comunicação' }))
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith(
      'create_internal_communication_for_interface',
      { p_recipient_ids: ['account-2'], p_kind: 'demanda_administrativa',
        p_subject: 'Verificar encaixe', p_body: 'Favor avaliar a disponibilidade.', p_patient_id: null },
    ))
  })
  it('profissional envia apenas recados, não demandas oficiais', async () => {
    render(<InternalCommunicationPage accessContext={professional} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nova mensagem' }))
    await screen.findByText('Profissional de teste')
    expect(screen.getByRole('option', { name: 'Mensagem ou recado' })).toBeVisible()
    expect(screen.queryByRole('option', { name: 'Demanda oficial do Administrativo' })).not.toBeInTheDocument()
    expect(screen.getByText(/Para solicitar providências ao Administrativo/)).toBeVisible()
  })
})
