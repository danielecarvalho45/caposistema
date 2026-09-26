import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgendaPage } from '../../src/features/agenda/AgendaPage'
import type { AccessContext } from '../../src/types/access'
import type { AgendaAppointment } from '../../src/lib/supabase/rpc'

const accessContext: AccessContext = {
  user_account_id: 'account-id',
  username: 'profissional.capo',
  is_active: true,
  recovery_email: null,
  professional_id: 'professional-id',
  full_name: 'Profissional autorizado',
  function_title: 'Psicóloga',
  professional_registration: null,
  administrative_responsibility: null,
  first_access_completed: true,
  must_change_password: false,
  roles: [{ code: 'profissional', name: 'Profissional' }],
  capabilities: [],
  primary_context: {
    role_id: 'role-id',
    code: 'profissional',
    name: 'Profissional',
    source: 'single_role',
    is_configured: false,
    requires_configuration: false,
  },
  is_homologation_account: false,
  real_identity: {
    professional_id: 'professional-id',
    full_name: 'Profissional autorizado',
    function_title: 'Psicóloga',
    roles: [{ code: 'profissional', name: 'Profissional' }],
    primary_context: {
      role_id: 'role-id',
      code: 'profissional',
      name: 'Profissional',
      source: 'single_role',
      is_configured: false,
      requires_configuration: false,
    },
  },
  homologation_context: null,
}

const appointment: AgendaAppointment = {
  appointment_id: 'appointment-id',
  patient_id: 'patient-id',
  patient_name: 'Paciente autorizado',
  patient_number: 'CAPO-1',
  professional_id: 'professional-id',
  professional_name: 'Profissional autorizado',
  specialty_name: 'Psicologia',
  appointment_date: '2026-09-17T10:00:00-03:00',
  appointment_end: '2026-09-17T11:00:00-03:00',
  appointment_type: 'Retorno',
  attendance_status: 'agendado',
  general_notes: null,
  rescheduled_from_id: null,
  reschedule_reason: null,
  reschedule_origin: null,
}

describe('AgendaPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(2026, 8, 17, 10, 0, 0))
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('consulta os intervalos reais de dia, semana e mês', async () => {
    const loadAgenda = vi.fn().mockResolvedValue({ status: 'empty' })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<AgendaPage accessContext={accessContext} loadAgenda={loadAgenda} />)

    await waitFor(() =>
      expect(loadAgenda).toHaveBeenLastCalledWith(
        '2026-09-17',
        '2026-09-17',
        'professional-id',
      ),
    )

    await user.click(screen.getByRole('tab', { name: 'Semana' }))
    await waitFor(() =>
      expect(loadAgenda).toHaveBeenLastCalledWith(
        '2026-09-14',
        '2026-09-20',
        'professional-id',
      ),
    )

    await user.click(screen.getByRole('tab', { name: 'Mês' }))
    await waitFor(() =>
      expect(loadAgenda).toHaveBeenLastCalledWith(
        '2026-09-01',
        '2026-09-30',
        'professional-id',
      ),
    )
  })

  it('mostra especialidades do paciente somente após a consulta autorizada', async () => {
    const loadAgenda = vi.fn().mockResolvedValue({ status: 'success', data: [appointment] })
    const loadPatientSpecialties = vi.fn().mockResolvedValue({
      status: 'success', data: [{ specialty_id: 'specialty-id', specialty_name: 'Psicologia' }],
    })
    render(<AgendaPage accessContext={accessContext} loadAgenda={loadAgenda} loadPatientSpecialties={loadPatientSpecialties} />)
    expect(await screen.findByText('Especialidades: Psicologia')).toBeVisible()
    expect(loadPatientSpecialties).toHaveBeenCalledWith('patient-id')
  })

  it('aceita o papel de Nutrição na agenda compartilhada do profissional', async () => {
    const loadAgenda = vi.fn().mockResolvedValue({
      status: 'success',
      data: [{ ...appointment, specialty_name: 'Nutrição' }],
    })
    const nutritionContext: AccessContext = {
      ...accessContext,
      professional_id: 'nutrition-professional-id',
      function_title: 'Nutricionista',
      roles: [{ code: 'nutricao', name: 'Nutrição' }],
      primary_context: {
        ...accessContext.primary_context,
        code: 'nutricao',
        name: 'Nutrição',
      },
      real_identity: {
        ...accessContext.real_identity,
        professional_id: 'nutrition-professional-id',
        function_title: 'Nutricionista',
        roles: [{ code: 'nutricao', name: 'Nutrição' }],
        primary_context: {
          ...accessContext.primary_context,
          code: 'nutricao',
          name: 'Nutrição',
        },
      },
    }

    render(<AgendaPage accessContext={nutritionContext} loadAgenda={loadAgenda} />)

    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Dia' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Semana' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Mês' })).toBeVisible()
    expect(screen.queryByRole('columnheader', { name: 'Especialidade' })).not.toBeInTheDocument()
    await waitFor(() =>
      expect(loadAgenda).toHaveBeenLastCalledWith(
        '2026-09-17',
        '2026-09-17',
        'nutrition-professional-id',
      ),
    )
  })

  it('mantém a visão geral quando o papel profissional é acumulado mas não é o contexto principal', async () => {
    const loadAgenda = vi.fn().mockResolvedValue({ status: 'empty' })
    const accumulatedContext: AccessContext = {
      ...accessContext,
      roles: [
        { code: 'administrador', name: 'Administrador' },
        { code: 'profissional', name: 'Profissional' },
      ],
      primary_context: {
        ...accessContext.primary_context,
        code: 'administrador',
        name: 'Administrador',
        source: 'configured',
        is_configured: true,
      },
    }

    render(<AgendaPage accessContext={accumulatedContext} loadAgenda={loadAgenda} />)

    expect(await screen.findByRole('heading', { name: 'Agenda Geral' })).toBeVisible()
    await waitFor(() =>
      expect(loadAgenda).toHaveBeenLastCalledWith(
        '2026-09-17',
        '2026-09-17',
        null,
      ),
    )
  })

  it('usa a visão geral de agenda para o Gestor sem misturar com o contexto assistencial', async () => {
    const loadAgenda = vi.fn().mockResolvedValue({ status: 'empty' })
    const gestorContext: AccessContext = {
      ...accessContext,
      professional_id: null,
      full_name: 'Gestor titular',
      function_title: 'Administrador do Sistema',
      roles: [{ code: 'administrador', name: 'Administrador' }],
      primary_context: {
        ...accessContext.primary_context,
        code: 'administrador',
        name: 'Administrador',
      },
      real_identity: {
        ...accessContext.real_identity,
        professional_id: null,
        full_name: 'Gestor titular',
        function_title: 'Administrador do Sistema',
        roles: [{ code: 'administrador', name: 'Administrador' }],
        primary_context: {
          ...accessContext.primary_context,
          code: 'administrador',
          name: 'Administrador',
        },
      },
    }

    render(<AgendaPage accessContext={gestorContext} loadAgenda={loadAgenda} />)

    expect(await screen.findByRole('heading', { name: 'Agenda Geral' })).toBeVisible()
    expect(
      screen.queryByText('Operacional assistencial'),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Dia' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Semana' })).toBeVisible()
    expect(screen.getByRole('tab', { name: 'Mês' })).toBeVisible()
    await waitFor(() =>
      expect(loadAgenda).toHaveBeenLastCalledWith(
        '2026-09-17',
        '2026-09-17',
        null,
      ),
    )
  })

  it('apresenta os dados reais nas visualizações de dia, semana e mês', async () => {
    const loadAgenda = vi.fn().mockResolvedValue({
      status: 'success',
      data: [appointment],
    })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<AgendaPage accessContext={accessContext} loadAgenda={loadAgenda} />)

    expect(await screen.findByText('Paciente autorizado')).toBeVisible()
    expect(screen.getByRole('table')).toBeVisible()

    await user.click(screen.getByRole('tab', { name: 'Semana' }))
    expect(await screen.findByLabelText('Agenda da semana')).toBeVisible()
    expect(screen.getByRole('heading', { name: /quinta-feira/i })).toBeVisible()
    expect(screen.getByText('Paciente autorizado')).toBeVisible()

    await user.click(screen.getByRole('tab', { name: 'Mês' }))
    expect(await screen.findByLabelText('Agenda do mês')).toBeVisible()
    expect(screen.getByText('Paciente autorizado')).toBeVisible()
    expect(screen.getByText('Psicologia')).toBeVisible()
  })

  it('descarta uma resposta antiga depois de trocar o período', async () => {
    let resolveFirst: ((value: unknown) => void) | undefined
    const firstRequest = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const loadAgenda = vi
      .fn()
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValueOnce({ status: 'success', data: [appointment] })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<AgendaPage accessContext={accessContext} loadAgenda={loadAgenda} />)
    await waitFor(() => expect(loadAgenda).toHaveBeenCalledOnce())

    await user.click(screen.getByRole('tab', { name: 'Semana' }))
    expect(await screen.findByText('Paciente autorizado')).toBeVisible()

    resolveFirst?.({
      status: 'success',
      data: [{ ...appointment, patient_name: 'Resposta antiga' }],
    })

    await waitFor(() =>
      expect(screen.queryByText('Resposta antiga')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Paciente autorizado')).toBeVisible()
  })
})
