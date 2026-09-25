import { describe, expect, it, vi } from 'vitest'
import {
  createRpcService,
  loadingState,
  type RpcTransport,
} from '../../src/lib/supabase/rpc'

const accessContext = {
  user_account_id: 'account-id',
  username: 'usuario',
  is_active: true,
  recovery_email: null,
  professional_id: 'professional-id',
  full_name: 'Nome real',
  function_title: null,
  professional_registration: null,
  administrative_responsibility: null,
  first_access_completed: true,
  must_change_password: false,
  roles: [
    { code: 'administrativo_operacional', name: 'Administrativo Operacional' },
  ],
  capabilities: ['preencher_solicitacao_transporte'],
  primary_context: {
    role_id: 'role-id',
    code: 'administrativo_operacional',
    name: 'Administrativo Operacional',
    source: 'configured',
    is_configured: true,
    requires_configuration: false,
  },
  is_homologation_account: false,
  real_identity: {
    professional_id: 'professional-id',
    full_name: 'Nome real',
    function_title: null,
    roles: [
      {
        code: 'administrativo_operacional',
        name: 'Administrativo Operacional',
      },
    ],
    primary_context: {
      role_id: 'role-id',
      code: 'administrativo_operacional',
      name: 'Administrativo Operacional',
      source: 'configured',
      is_configured: true,
      requires_configuration: false,
    },
  },
  homologation_context: null,
}

function transportWith(data: unknown, error: unknown = null): RpcTransport {
  return vi.fn().mockResolvedValue({ data, error })
}

describe('camada de RPCs CAPO', () => {
  it('expõe o estado inicial loading', () => {
    expect(loadingState()).toEqual({ status: 'loading' })
  })

  it('valida e retorna o contexto de acesso', async () => {
    const result = await createRpcService(
      transportWith(accessContext),
    ).getMyAccessContext()

    expect(result).toMatchObject({
      status: 'success',
      data: {
        primary_context: { code: 'administrativo_operacional' },
        capabilities: ['preencher_solicitacao_transporte'],
      },
    })
  })

  it('não converte silenciosamente contrato inesperado', async () => {
    const result = await createRpcService(
      transportWith({ ...accessContext, roles: 'administrador' }),
    ).getMyAccessContext()

    expect(result).toMatchObject({
      status: 'error',
      error: { kind: 'contract', operation: 'get_my_access_context' },
    })
  })

  it('diferencia resposta vazia de erro', async () => {
    const empty = await createRpcService(
      transportWith([]),
    ).getCurrentLegalTerm()
    const failed = await createRpcService(
      transportWith(null, {
        code: '42501',
        message: 'Usuário não autenticado.',
      }),
    ).getCurrentLegalTerm()

    expect(empty).toEqual({ status: 'empty' })
    expect(failed).toMatchObject({
      status: 'error',
      error: { kind: 'authorization', code: '42501' },
    })
  })

  it('valida o termo vigente retornado pela RPC física', async () => {
    const result = await createRpcService(
      transportWith([
        {
          legal_term_id: 'term-id',
          title: 'Termo vigente',
          version: '1',
          content: 'Conteúdo integral',
          effective_at: '2026-09-15T12:00:00Z',
          requires_reacceptance: true,
          accepted: false,
          accepted_at: null,
        },
      ]),
    ).getCurrentLegalTerm()

    expect(result).toMatchObject({
      status: 'success',
      data: { legal_term_id: 'term-id', accepted: false },
    })
  })

  it('envia somente o argumento físico ao aceitar o termo', async () => {
    const transport = transportWith([
      {
        acceptance_id: 'acceptance-id',
        accepted_at: '2026-09-15T12:00:00Z',
        already_accepted: false,
      },
    ])
    const result = await createRpcService(transport).acceptLegalTerm('term-id')

    expect(transport).toHaveBeenCalledWith('accept_legal_term', {
      p_legal_term_id: 'term-id',
    })
    expect(result).toMatchObject({ status: 'success' })
  })

  it('valida o resultado de conclusão do primeiro acesso', async () => {
    const result = await createRpcService(
      transportWith({
        professional_id: 'professional-id',
        first_access_completed: true,
        must_change_password: false,
        completed_at: '2026-09-15T12:00:00Z',
      }),
    ).completeFirstAccess()

    expect(result).toMatchObject({
      status: 'success',
      data: { first_access_completed: true, must_change_password: false },
    })
  })

  it('preserva falha de rede como erro rastreável', async () => {
    const transport: RpcTransport = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch'))

    const result = await createRpcService(transport).getMyAccessContext()

    expect(result).toMatchObject({
      status: 'error',
      error: { kind: 'network', message: 'Failed to fetch' },
    })
  })

  it('valida e retorna as pendências operacionais da RPC física', async () => {
    const transport = transportWith([
      {
        pending_type: 'waiting_list',
        source_table: 'waiting_list',
        source_id: 'pending-id',
        patient_id: 'patient-id',
        patient_name: 'Paciente autorizado',
        title: 'Fila de espera — Nutrição',
        status: 'waiting',
        responsible_role: 'administrativo_operacional',
        created_at: '2026-09-15T12:00:00Z',
        due_at: null,
        context_module: 'waiting_list',
        context_id: 'pending-id',
        priority: 1,
        total_count: 1,
      },
    ])

    const result = await createRpcService(transport).getPendingItems(25, 0)

    expect(transport).toHaveBeenCalledWith('get_pending_items_for_interface', {
      p_limit: 25,
      p_offset: 0,
    })
    expect(result).toMatchObject({
      status: 'success',
      data: [{ pending_type: 'waiting_list', total_count: 1 }],
    })
  })

  it('rejeita contrato inválido da fila sem renderizar dados parciais', async () => {
    const result = await createRpcService(
      transportWith([{ pending_type: 'waiting_list' }]),
    ).getPendingItems()

    expect(result).toMatchObject({
      status: 'error',
      error: {
        kind: 'contract',
        operation: 'get_pending_items_for_interface',
      },
    })
  })

  it('valida o contrato físico da lista de faltosos', async () => {
    const transport = transportWith([
      {
        followup_id: 'followup-id',
        appointment_id: 'appointment-id',
        patient_id: 'patient-id',
        patient_name: 'Paciente autorizado',
        patient_number: null,
        cms: '12345',
        professional_id: 'professional-id',
        professional_name: 'Profissional responsável',
        no_show_date: '2026-09-16T12:00:00Z',
        active_search_status: 'pendente',
        contact_attempts: 0,
        first_contact_at: null,
        last_contact_at: null,
        contact_result: null,
        next_contact_date: null,
        rescheduling_requested: false,
        reschedule_request_id: null,
        rescheduled_appointment_id: null,
      },
    ])

    const result = await createRpcService(transport).getNoShowFollowups(
      'pendente',
      25,
      0,
    )

    expect(transport).toHaveBeenCalledWith(
      'get_no_show_followups_for_interface',
      { p_status: 'pendente', p_limit: 25, p_offset: 0 },
    )
    expect(result).toMatchObject({
      status: 'success',
      data: [{ followup_id: 'followup-id', patient_number: null }],
    })
  })

  it('envia e valida o registro de contato de faltoso', async () => {
    const transport = transportWith({
      success: true,
      followup_id: 'followup-id',
      contact_id: 'contact-id',
      status: 'contatado',
      contact_attempt_registered: true,
      registered_at: '2026-09-16T13:00:00Z',
    })
    const result = await createRpcService(transport).registerNoShowContact({
      followupId: 'followup-id',
      contactMethod: 'phone',
      contactResult: 'Contato realizado',
      acceptedService: true,
      nextAction: null,
      notes: null,
      nextContactDate: null,
      newStatus: 'contatado',
    })

    expect(transport).toHaveBeenCalledWith(
      'register_no_show_contact_for_interface',
      expect.objectContaining({
        p_followup_id: 'followup-id',
        p_contact_method: 'phone',
        p_new_status: 'contatado',
      }),
    )
    expect(result).toMatchObject({
      status: 'success',
      data: { contact_id: 'contact-id' },
    })
  })

  it('rejeita histórico de contatos com contrato parcial', async () => {
    const result = await createRpcService(
      transportWith([{ contact_id: 'contact-id' }]),
    ).getNoShowContacts('followup-id')

    expect(result).toMatchObject({
      status: 'error',
      error: {
        kind: 'contract',
        operation: 'get_no_show_contacts_for_interface',
      },
    })
  })

  it('valida solicitações, histórico e atualização pelo contrato físico', async () => {
    const request = {
      request_id: 'request-id',
      patient_id: null,
      patient_name: null,
      patient_number: null,
      cms: null,
      requesting_professional_id: 'professional-id',
      requesting_professional_name: 'Profissional solicitante',
      subject: 'Apoio administrativo',
      description: 'Providenciar contato institucional.',
      status: 'returned',
      administrative_response: 'Complementar informação.',
      counter_reference: null,
      created_at: '2026-09-16T12:00:00Z',
      updated_at: '2026-09-16T13:00:00Z',
      completed_at: null,
      cancelled_at: null,
      total_count: 1,
    }
    const listTransport = transportWith([request])
    const list = await createRpcService(
      listTransport,
    ).getAdministrativeRequests('returned', 25, 0)
    expect(listTransport).toHaveBeenCalledWith(
      'get_administrative_requests_for_interface',
      { p_status: 'returned', p_limit: 25, p_offset: 0 },
    )
    expect(list).toMatchObject({ status: 'success', data: [request] })

    const updateTransport = transportWith({
      success: true,
      request_id: 'request-id',
      action: 'resubmit',
      previous_status: 'returned',
      status: 'pending',
      updated_at: '2026-09-16T14:00:00Z',
    })
    const update = await createRpcService(
      updateTransport,
    ).updateAdministrativeRequest(
      'request-id',
      'resubmit',
      'Informação complementar.',
      null,
    )
    expect(updateTransport).toHaveBeenCalledWith(
      'update_administrative_request_for_interface',
      expect.objectContaining({
        p_request_id: 'request-id',
        p_action: 'resubmit',
      }),
    )
    expect(update).toMatchObject({
      status: 'success',
      data: { status: 'pending' },
    })
  })

  it('valida o contrato sanitizado de aniversariantes', async () => {
    const transport = transportWith({
      reference_date: '2026-09-16',
      time_zone: 'America/Sao_Paulo',
      patients: [
        {
          patient_id: 'patient-id',
          full_name: 'Paciente autorizado',
          patient_number: null,
          cms: '12345',
        },
      ],
      team: [
        {
          professional_id: 'professional-id',
          full_name: 'Integrante CAPO',
          function_title: 'Nutricionista',
        },
      ],
    })

    const result = await createRpcService(transport).getBirthdays()

    expect(transport).toHaveBeenCalledWith(
      'get_birthdays_for_interface',
      undefined,
    )
    expect(result).toMatchObject({
      status: 'success',
      data: {
        patients: [{ patient_id: 'patient-id' }],
        team: [{ professional_id: 'professional-id' }],
      },
    })
  })

  it('valida listagem e mutação do encaminhamento interprofissional', async () => {
    const referral = {
      referral_id: 'referral-id',
      patient_id: 'patient-id',
      patient_name: 'Paciente autorizado',
      patient_number: 'CAPO-1',
      cms: '12345',
      requesting_professional_id: 'requester-id',
      requesting_professional_name: 'Profissional solicitante',
      origin_specialty_id: 'origin-id',
      origin_specialty_name: 'Nutrição',
      requested_specialty_id: 'target-specialty-id',
      requested_specialty_name: 'Clínica Geral',
      target_professional_id: null,
      target_professional_name: null,
      operational_reason: 'Avaliação interprofissional.',
      response: null,
      status: 'pending_approval',
      direction: 'managed',
      source_appointment_id: null,
      created_at: '2026-09-16T12:00:00Z',
      updated_at: '2026-09-16T12:00:00Z',
      approved_at: null,
      completed_at: null,
      cancelled_at: null,
      last_action: 'Avaliação interprofissional.',
      total_count: 1,
    }
    const listTransport = transportWith([referral])
    const list = await createRpcService(
      listTransport,
    ).getInterprofessionalReferrals('all', null, 50, 0)

    expect(listTransport).toHaveBeenCalledWith(
      'get_interprofessional_referrals_for_interface',
      { p_direction: 'all', p_status: null, p_limit: 50, p_offset: 0 },
    )
    expect(list).toMatchObject({
      status: 'success',
      data: [{ referral_id: 'referral-id', status: 'pending_approval' }],
    })

    const mutationTransport = transportWith({
      success: true,
      referral_id: 'referral-id',
      action: 'approve',
      previous_status: 'pending_approval',
      status: 'approved',
      updated_at: '2026-09-16T13:00:00Z',
    })
    const mutation = await createRpcService(
      mutationTransport,
    ).updateInterprofessionalReferral(
      'referral-id',
      'approve',
      null,
      'target-professional-id',
    )

    expect(mutationTransport).toHaveBeenCalledWith(
      'update_interprofessional_referral_for_interface',
      expect.objectContaining({
        p_referral_id: 'referral-id',
        p_action: 'approve',
        p_target_professional_id: 'target-professional-id',
      }),
    )
    expect(mutation).toMatchObject({
      status: 'success',
      data: { status: 'approved' },
    })
  })

  it('valida o contrato de renovação de receita', async () => {
    const doctorsTransport = transportWith([
      {
        professional_id: 'doctor-id',
        full_name: 'Dr. José Silva',
        function_title: 'Médico - Clínico Geral',
        professional_registration: 'CRM-12345',
        has_active_account: true,
      },
    ])

    const doctors =
      await createRpcService(doctorsTransport).getPrescriptionRenewalDoctors()

    expect(doctorsTransport).toHaveBeenCalledWith(
      'get_prescription_renewal_doctors_for_interface',
      undefined,
    )
    expect(doctors).toMatchObject({
      status: 'success',
      data: [{ doctor_id: 'doctor-id', doctor_name: 'Dr. José Silva', has_active_account: true }],
    })

    const createTransport = transportWith({
      success: true,
      request_id: 'renewal-id',
      status: 'awaiting_medical',
      created_at: '2026-09-16T12:00:00Z',
    })

    const created = await createRpcService(
      createTransport,
    ).createPrescriptionRenewal(
      'patient-id',
      'doctor-id',
      'Renovação por continuidade de tratamento.',
    )

    expect(createTransport).toHaveBeenCalledWith(
      'create_prescription_renewal_for_interface',
      {
        p_patient_id: 'patient-id',
        p_target_doctor_id: 'doctor-id',
        p_administrative_note: 'Renovação por continuidade de tratamento.',
      },
    )
    expect(created).toMatchObject({
      status: 'success',
      data: { renewal_id: 'renewal-id', status: 'awaiting_medical' },
    })

    const listTransport = transportWith([
      {
        request_id: 'renewal-id',
        patient_id: 'patient-id',
        patient_name: 'Paciente autorizado',
        patient_number: 'CAPO-1',
        cms: '12345',
        administrative_note: 'Renovação por continuidade de tratamento.',
        target_doctor_id: 'doctor-id',
        target_doctor_name: 'Dr. José Silva',
        target_doctor_registration: 'CRM-12345',
        status: 'awaiting_medical',
        medical_processed_by: null,
        medical_processed_by_name: null,
        medical_return: null,
        medical_returned_at: null,
        pickup_location: null,
        final_admin_note: null,
        patient_contacted_at: null,
        completed_at: null,
        cancelled_at: null,
        cancellation_reason: null,
        requested_at: '2026-09-16T12:00:00Z',
        updated_at: '2026-09-16T12:30:00Z',
        history: [],
        total_count: 1,
      },
    ])

    const renewals = await createRpcService(
      listTransport,
    ).getPrescriptionRenewals('awaiting_medical', 25, 0)

    expect(listTransport).toHaveBeenCalledWith(
      'get_prescription_renewals_for_interface',
      {
        p_status: 'awaiting_medical',
        p_limit: 25,
        p_offset: 0,
      },
    )
    expect(renewals).toMatchObject({
      status: 'success',
      data: [{ renewal_id: 'renewal-id', patient_name: 'Paciente autorizado' }],
    })

    const medicalTransport = transportWith({
      success: true,
      request_id: 'renewal-id',
      status: 'awaiting_admin',
      updated_at: '2026-09-16T13:00:00Z',
    })

    const medical = await createRpcService(
      medicalTransport,
    ).managePrescriptionRenewalMedical(
      'renewal-id',
      'complete',
      'Receita renovada e disponível para orientação administrativa.',
    )

    expect(medicalTransport).toHaveBeenCalledWith(
      'manage_prescription_renewal_medical_for_interface',
      {
        p_request_id: 'renewal-id',
        p_action: 'complete',
        p_operational_return: 'Receita renovada e disponível para orientação administrativa.',
      },
    )
    expect(medical).toMatchObject({
      status: 'success',
      data: { status: 'awaiting_admin' },
    })

    const adminTransport = transportWith({
      success: true,
      request_id: 'renewal-id',
      status: 'completed',
      completed_at: '2026-09-16T14:00:00Z',
    })

    const admin = await createRpcService(
      adminTransport,
    ).managePrescriptionRenewalAdmin({
      renewalId: 'renewal-id',
      action: 'complete',
      pickupLocation: 'CAPO',
      finalAdminNote: 'Paciente orientado.',
      patientContacted: true,
    })

    expect(adminTransport).toHaveBeenCalledWith(
      'manage_prescription_renewal_admin_for_interface',
      {
        p_request_id: 'renewal-id',
        p_action: 'complete',
        p_target_doctor_id: null,
        p_pickup_location: 'CAPO',
        p_final_admin_note: 'Paciente orientado.',
        p_patient_contacted: true,
        p_reason: null,
      },
    )
    expect(admin).toMatchObject({
      status: 'success',
      data: { status: 'completed' },
    })
  })

  it('valida os loaders compartilhados da atuação assistencial', async () => {
    const specialtiesTransport = transportWith([
      {
        specialty_id: 'specialty-id',
        specialty_name: 'Psicologia',
        is_current_context: true,
      },
    ])
    const specialties =
      await createRpcService(
        specialtiesTransport,
      ).getMyAssistentialSpecialties()

    expect(specialtiesTransport).toHaveBeenCalledWith(
      'get_my_assistential_specialties_for_interface',
      undefined,
    )
    expect(specialties).toMatchObject({
      status: 'success',
      data: [{ specialty_name: 'Psicologia' }],
    })

    const patientsTransport = transportWith([
      {
        patient_id: 'patient-id',
        full_name: 'Paciente autorizado',
        patient_number: 'CAPO-1',
        cms: null,
        status: 'ativo',
        total_count: 1,
      },
    ])
    const patients = await createRpcService(
      patientsTransport,
    ).searchMyAssistentialPatients('Paciente', 10, 0)

    expect(patientsTransport).toHaveBeenCalledWith(
      'search_my_patients_for_interface',
      { p_query: 'Paciente', p_limit: 10, p_offset: 0 },
    )
    expect(patients).toMatchObject({
      status: 'success',
      data: [{ patient_id: 'patient-id' }],
    })

    const agendaTransport = transportWith([
      {
        appointment_id: 'appointment-id',
        patient_id: 'patient-id',
        patient_name: 'Paciente autorizado',
        patient_number: null,
        professional_id: 'professional-id',
        professional_name: 'Profissional CAPO',
        specialty_name: 'Psicologia',
        appointment_date: '2026-09-16T12:00:00Z',
        appointment_end: null,
        appointment_type: 'retorno',
        attendance_status: 'agendado',
        general_notes: null,
        rescheduled_from_id: null,
        reschedule_reason: null,
        reschedule_origin: null,
      },
    ])
    const agenda = await createRpcService(agendaTransport).getAgenda(
      '2026-09-16',
      '2026-09-23',
      'professional-id',
    )

    expect(agendaTransport).toHaveBeenCalledWith('get_agenda_for_interface', {
      p_start_date: '2026-09-16',
      p_end_date: '2026-09-23',
      p_professional_id: 'professional-id',
    })
    expect(agenda).toMatchObject({
      status: 'success',
      data: [{ appointment_end: null }],
    })

    const reportTransport = transportWith({
      specialty_id: 'specialty-id',
      specialty_name: 'Psicologia',
      start_date: '2026-09-01',
      end_date: '2026-09-16',
      agenda: { agendado: 1 },
      retornos: { realizado: 1 },
      fila_especialidade: { waiting: 0, scope: 'fila_especialidade' },
      solicitacoes: { pending: 0 },
      encaminhamentos: { enabled: true, completed: 0 },
      encerramentos: { pendente: 0 },
    })
    const report = await createRpcService(
      reportTransport,
    ).getMySpecialtyOperationalReport(
      'specialty-id',
      '2026-09-01',
      '2026-09-16',
    )

    expect(reportTransport).toHaveBeenCalledWith(
      'get_my_specialty_operational_report_for_interface',
      {
        p_specialty_id: 'specialty-id',
        p_start_date: '2026-09-01',
        p_end_date: '2026-09-16',
      },
    )
    expect(report).toMatchObject({
      status: 'success',
      data: { agenda: { agendado: 1 } },
    })
  })

  it('valida painel, estado, logs e histórico técnicos', async () => {
    const dashboardTransport = transportWith({
      period: {
        start_at: '2026-09-09T00:00:00Z',
        end_at: '2026-09-16T23:59:59Z',
      },
      support: { pendente: 0, resolvida: 0 },
      runtime: {
        by_severity: { info: 1, error: 0 },
        by_component: [{ component: 'system_status.database', count: 1 }],
        by_event_code: [{ event_code: 'DATABASE.OK', count: 1 }],
        by_result: [{ result: 'success', count: 1 }],
        recent_errors: [],
      },
    })
    const dashboard = await createRpcService(
      dashboardTransport,
    ).getTechnicalDashboard('2026-09-09T00:00:00Z', '2026-09-16T23:59:59Z', 10)

    expect(dashboardTransport).toHaveBeenCalledWith(
      'get_technical_dashboard_for_interface',
      {
        p_start_at: '2026-09-09T00:00:00Z',
        p_end_at: '2026-09-16T23:59:59Z',
        p_recent_limit: 10,
      },
    )
    expect(dashboard).toMatchObject({
      status: 'success',
      data: {
        runtime: { by_component: [{ label: 'system_status.database' }] },
      },
    })

    const statusTransport = transportWith({
      checked_at: '2026-09-16T12:00:00Z',
      components: [
        {
          component: 'database',
          label: 'Banco de Dados',
          status: 'operacional',
          verification: 'canonical_query',
          detail: 'Consulta canônica executada.',
          checked_at: '2026-09-16T12:00:00Z',
        },
      ],
    })
    const status =
      await createRpcService(statusTransport).getTechnicalSystemStatus()

    expect(statusTransport).toHaveBeenCalledWith(
      'get_technical_system_status_for_interface',
      undefined,
    )
    expect(status).toMatchObject({
      status: 'success',
      data: { components: [{ status: 'operacional' }] },
    })

    const logsTransport = transportWith([
      {
        id: 'log-id',
        occurred_at: '2026-09-16T12:00:00Z',
        severity: 'info',
        component: 'system_status.database',
        operation_name: null,
        event_code: 'DATABASE.OK',
        result: 'success',
        technical_message: null,
        correlation_id: null,
        actor_account_id: null,
        support_request_id: null,
        duration_ms: null,
        total_count: 1,
      },
    ])
    const logs = await createRpcService(logsTransport).getTechnicalRuntimeLogs(
      '2026-09-09T00:00:00Z',
      '2026-09-16T23:59:59Z',
      'info',
      null,
      null,
      50,
      0,
    )

    expect(logsTransport).toHaveBeenCalledWith(
      'get_technical_runtime_logs_for_interface',
      expect.objectContaining({ p_severity: 'info', p_limit: 50 }),
    )
    expect(logs).toMatchObject({
      status: 'success',
      data: [{ technical_message: null, total_count: 1 }],
    })

    const historyTransport = transportWith({
      request_id: 'request-id',
      events: [
        {
          audit_id: 'audit-id',
          occurred_at: '2026-09-16T12:00:00Z',
          action: 'UPDATE',
          actor_account_id: null,
          previous_status: 'pendente',
          new_status: 'em_atendimento',
          previous_assigned_account_id: null,
          new_assigned_account_id: 'account-id',
          resolved_by_account_id: null,
          requires_user_test: false,
          user_test_approved: null,
          started_at: '2026-09-16T12:00:00Z',
          resolved_at: null,
          user_tested_at: null,
        },
      ],
    })
    const history =
      await createRpcService(historyTransport).getTechnicalSupportHistory(
        'request-id',
      )

    expect(historyTransport).toHaveBeenCalledWith(
      'get_technical_support_history_for_interface',
      { p_request_id: 'request-id' },
    )
    expect(history).toMatchObject({
      status: 'success',
      data: { events: [{ new_status: 'em_atendimento' }] },
    })
  })
})
