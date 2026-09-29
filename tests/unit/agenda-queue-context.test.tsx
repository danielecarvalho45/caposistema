import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import { AgendaPage } from '../../src/features/agenda/AgendaPage'
import type { AccessContext } from '../../src/types/access'

const rpc = vi.hoisted(() => ({
  getSchedulingCatalog: vi.fn(), getAvailableAppointmentSlots: vi.fn(),
  searchReferralPatients: vi.fn(), addPatientToWaitingList: vi.fn(),
}))
vi.mock('../../src/lib/supabase/rpc', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../src/lib/supabase/rpc')>()), getRpcService: () => rpc }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('aproveita paciente e especialidade já selecionados quando não há vaga', async () => {
  rpc.getSchedulingCatalog.mockResolvedValue({ status: 'success', data: [{ specialty_id: 's1', specialty_name: 'Nutrição', professional_id: 'p1', professional_name: 'Profissional autorizado' }] })
  rpc.getAvailableAppointmentSlots.mockResolvedValue({ status: 'empty' })
  rpc.searchReferralPatients.mockResolvedValue({ status: 'success', data: [{ patient_id: 'patient-1', full_name: 'Paciente encontrado', patient_number: null, cms: null }] })
  rpc.addPatientToWaitingList.mockResolvedValue({ status: 'success', data: { success: true } })
  const context = { roles: [{ code: 'administrador' }], primary_context: { code: 'administrador' }, professional_id: null } as unknown as AccessContext
  const user = userEvent.setup()
  render(<MemoryRouter><AgendaPage accessContext={context} loadAgenda={async () => ({ status: 'empty' })} /></MemoryRouter>)
  await user.click(screen.getByRole('button', { name: 'Agendar' }))
  await user.type(screen.getByPlaceholderText('Nome, Nº CAPO ou CMS'), 'Paciente')
  await user.tab()
  await user.selectOptions((await screen.findByRole('option', { name: /Paciente encontrado/ })).closest('select')!, 'patient-1')
  await user.selectOptions(screen.getByLabelText('Especialidade *'), 's1')
  await user.selectOptions(screen.getByLabelText('Profissional *'), 'p1')
  await user.click(await screen.findByRole('button', { name: 'Incluir na fila' }))
  expect(rpc.addPatientToWaitingList).toHaveBeenCalledWith('patient-1', 's1', 3, null)
  expect(await screen.findByText('Paciente incluído na fila de espera desta especialidade.')).toBeVisible()
})


it('abre o agendamento com o paciente da consulta mesmo antes de escolher especialidade', async () => {
  rpc.getSchedulingCatalog.mockResolvedValue({
    status: 'success',
    data: [{
      specialty_id: 's1',
      specialty_name: 'Nutrição',
      professional_id: 'p1',
      professional_name: 'Profissional autorizado',
    }],
  })
  rpc.getAvailableAppointmentSlots.mockResolvedValue({ status: 'empty' })
  const context = {
    roles: [{ code: 'administrador' }],
    primary_context: { code: 'administrador' },
    professional_id: null,
  } as unknown as AccessContext

  render(
    <MemoryRouter initialEntries={[{
      pathname: '/agenda',
      state: {
        patientId: 'patient-1',
        patientName: 'Paciente selecionado',
        origin: 'patient_record',
      },
    }]}>
      <AgendaPage
        accessContext={context}
        loadAgenda={async () => ({ status: 'empty' })}
      />
    </MemoryRouter>,
  )

  expect(await screen.findByDisplayValue('Paciente selecionado')).toBeVisible()
  expect(screen.getByLabelText('Especialidade *')).toBeVisible()
})
