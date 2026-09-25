export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: Record<never, never>
    Views: Record<never, never>
    Functions: {
      create_technical_support_request_for_interface: {
        Args: {
          p_subject: string
          p_category: string
          p_description: string
          p_priority: string
          p_affected_module: string
        }
        Returns: Json
      }
      update_appointment_attendance_for_interface: {
        Args: {
          p_appointment_id: string
          p_action: string
          p_notes: string
          p_reason: string
        }
        Returns: Json
      }
      get_reports_dashboard_for_interface: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_specialty_id: string | null
        }
        Returns: Json
      }
      get_patient_timeline_for_interface: {
        Args: {
          p_patient_id: string
          p_before_at: string | null
          p_before_key: string | null
          p_limit: number
        }
        Returns: Json
      }
      get_audit_logs_for_interface: {
        Args: {
          p_start_at: string
          p_end_at: string
          p_entity_name: string | null
          p_action: string | null
          p_actor_account_id: string | null
          p_record_id: string | null
          p_before_created_at: string | null
          p_before_id: string | null
          p_limit: number
        }
        Returns: Json
      }
      create_team_member_profile_for_interface: {
        Args: {
          p_administrative_responsibility: string | null
          p_auth_user_id: string | null
          p_birth_date: string | null
          p_full_name: string
          p_function_title: string | null
          p_is_professional: boolean
          p_phone: string | null
          p_primary_specialty_id: string | null
          p_professional_registration: string | null
          p_recovery_email: string | null
          p_role_codes: string[]
          p_specialty_ids: string[]
          p_username: string | null
        }
        Returns: Json
      }
      get_team_management_context_for_interface: {
        Args: {
          p_query: string | null
          p_status: string | null
          p_limit: number
          p_offset: number
        }
        Returns: Json
      }
      update_team_member_profile_for_interface: {
        Args: {
          p_professional_id: string
          p_administrative_responsibility: string | null
          p_birth_date: string | null
          p_full_name: string
          p_function_title: string | null
          p_is_professional: boolean
          p_phone: string | null
          p_primary_specialty_id: string | null
          p_professional_registration: string | null
          p_recovery_email: string | null
          p_role_codes: string[]
          p_specialty_ids: string[]
          p_username: string | null
        }
        Returns: Json
      }
      set_team_member_active_for_interface: {
        Args: { p_professional_id: string; p_active: boolean; p_reason: string }
        Returns: Json
      }
      set_team_member_primary_context_for_interface: {
        Args: { p_user_account_id: string; p_role_code: string }
        Returns: Json
      }
      get_effective_professional_capabilities: {
        Args: { p_professional_id: string }
        Returns: Json
      }
      set_professional_capability_for_interface: {
        Args: {
          p_professional_id: string
          p_capability_code: string
          p_is_enabled: boolean
        }
        Returns: Json
      }
      remove_professional_capability_for_interface: {
        Args: { p_professional_id: string; p_capability_code: string }
        Returns: Json
      }
      set_specialty_capability_status_for_interface: {
        Args: {
          p_specialty_id: string
          p_capability_code: string
          p_is_enabled: boolean
        }
        Returns: Json
      }
      accept_legal_term: {
        Args: { p_legal_term_id: string }
        Returns: {
          acceptance_id: string
          accepted_at: string
          already_accepted: boolean
        }[]
      }
      complete_first_access: {
        Args: Record<never, never>
        Returns: Json
      }
      get_current_legal_term: {
        Args: Record<never, never>
        Returns: {
          accepted: boolean
          accepted_at: string | null
          content: string
          effective_at: string
          legal_term_id: string
          requires_reacceptance: boolean
          title: string
          version: string
        }[]
      }
      get_my_access_context: {
        Args: Record<never, never>
        Returns: Json
      }
      get_pending_items_for_interface: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          pending_type: string
          source_table: string
          source_id: string
          patient_id: string | null
          patient_name: string | null
          title: string
          status: string
          responsible_role: string
          created_at: string
          due_at: string | null
          context_module: string
          context_id: string
          priority: number | null
          total_count: number
        }[]
      }
      get_my_notifications_for_interface: {
        Args: {
          p_only_unread: boolean
          p_limit: number
          p_offset: number
        }
        Returns: {
          notification_id: string
          notification_type: string
          title: string
          message: string
          priority: number | null
          status: string
          patient_id: string | null
          entity_type: string | null
          entity_id: string | null
          created_at: string
          read_at: string | null
          resolved_at: string | null
          total_count: number
        }[]
      }
      update_my_notification_for_interface: {
        Args: {
          p_notification_id: string
          p_action: string
          p_notes: string
        }
        Returns: {
          success: boolean
          notification_id: string
          action: string
        }[]
      }
      get_no_show_followups_for_interface: {
        Args: {
          p_status?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          followup_id: string
          appointment_id: string
          patient_id: string
          patient_name: string
          patient_number: string | null
          cms: string | null
          professional_id: string
          professional_name: string | null
          no_show_date: string
          active_search_status: string
          contact_attempts: number
          first_contact_at: string | null
          last_contact_at: string | null
          contact_result: string | null
          next_contact_date: string | null
          rescheduling_requested: boolean
          reschedule_request_id: string | null
          rescheduled_appointment_id: string | null
        }[]
      }
      get_no_show_contacts_for_interface: {
        Args: {
          p_followup_id: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          contact_id: string
          followup_id: string
          contact_method: string
          contact_result: string
          accepted_service: boolean | null
          next_action: string | null
          notes: string | null
          next_contact_date: string | null
          resulting_status: string
          created_at: string
        }[]
      }
      register_no_show_contact_for_interface: {
        Args: {
          p_followup_id: string
          p_contact_method: string
          p_contact_result: string
          p_accepted_service?: boolean | null
          p_next_action?: string | null
          p_notes?: string | null
          p_next_contact_date?: string | null
          p_new_status?: string
        }
        Returns: Json
      }
      request_no_show_rescheduling_for_interface: {
        Args: { p_followup_id: string; p_notes: string }
        Returns: Json
      }
      get_administrative_requests_for_interface: {
        Args: {
          p_status?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          request_id: string
          patient_id: string | null
          patient_name: string | null
          patient_number: string | null
          cms: string | null
          requesting_professional_id: string
          requesting_professional_name: string
          subject: string
          description: string
          status: string
          administrative_response: string | null
          counter_reference: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          cancelled_at: string | null
          total_count: number
        }[]
      }
      get_dentistry_access_context_for_interface: {
        Args: Record<never, never>
        Returns: Json
      }
      search_dentistry_patients_for_interface: {
        Args: { p_query: string; p_limit?: number; p_offset?: number }
        Returns: {
          patient_id: string
          full_name: string
          patient_number: string | null
          cms: string | null
        }[]
      }
      create_dentistry_referral_for_interface: {
        Args: { p_patient_id: string; p_operational_reason: string }
        Returns: Json
      }
      get_dentistry_referrals_for_interface: {
        Args: {
          p_status?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: Json
      }
      manage_dentistry_referral_for_interface: {
        Args: {
          p_referral_id: string
          p_action: string
          p_response?: string | null
        }
        Returns: Json
      }
      get_birthdays_for_interface: {
        Args: Record<never, never>
        Returns: Json
      }
      create_administrative_request_for_interface: {
        Args: {
          p_patient_id?: string | null
          p_subject: string
          p_description: string
        }
        Returns: Json
      }
      get_administrative_request_events_for_interface: {
        Args: { p_request_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          event_id: string
          request_id: string
          event_type: string
          from_status: string | null
          to_status: string
          detail: string | null
          counter_reference: string | null
          actor_name: string
          actor_role: string | null
          created_at: string
        }[]
      }
      get_prescription_renewal_doctors_for_interface: {
        Args: Record<never, never>
        Returns: {
          professional_id: string
          full_name: string
          function_title: string | null
          professional_registration: string | null
          has_active_account: boolean
        }[]
      }
      create_prescription_renewal_for_interface: {
        Args: {
          p_patient_id: string
          p_target_doctor_id: string
          p_administrative_note?: string | null
        }
        Returns: Json
      }
      get_prescription_renewals_for_interface: {
        Args: {
          p_status?: string | null
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          request_id: string
          patient_id: string
          patient_name: string
          patient_number: string | null
          cms: string | null
          administrative_note: string | null
          target_doctor_id: string
          target_doctor_name: string
          target_doctor_registration: string | null
          status: string
          medical_processed_by: string | null
          medical_processed_by_name: string | null
          medical_return: string | null
          medical_returned_at: string | null
          pickup_location: string | null
          final_admin_note: string | null
          patient_contacted_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          requested_at: string
          updated_at: string
          history: Json
          total_count: number
        }[]
      }
      manage_prescription_renewal_medical_for_interface: {
        Args: {
          p_request_id: string
          p_action: string
          p_operational_return?: string | null
        }
        Returns: Json
      }
      manage_prescription_renewal_admin_for_interface: {
        Args: {
          p_request_id: string
          p_action: string
          p_target_doctor_id?: string | null
          p_pickup_location?: string | null
          p_final_admin_note?: string | null
          p_patient_contacted?: boolean
          p_reason?: string | null
        }
        Returns: Json
      }
      update_administrative_request_for_interface: {
        Args: {
          p_request_id: string
          p_action: string
          p_response?: string | null
          p_counter_reference?: string | null
        }
        Returns: Json
      }
      search_patients_for_interface: {
        Args: { p_query?: string; p_limit?: number; p_offset?: number }
        Returns: {
          patient_id: string
          full_name: string
          patient_number: string | null
          cms: string | null
          birth_date: string | null
          age: number | null
          status: string
          deceased: boolean
          total_count: number
        }[]
      }
      get_interprofessional_referral_specialties_for_interface: {
        Args: Record<never, never>
        Returns: {
          specialty_id: string
          specialty_name: string
        }[]
      }
      get_interprofessional_referral_targets_for_interface: {
        Args: { p_specialty_id: string }
        Returns: {
          professional_id: string
          professional_name: string
        }[]
      }
      create_interprofessional_referral_for_interface: {
        Args: {
          p_patient_id: string
          p_target_specialty_id: string
          p_operational_reason: string
          p_source_appointment_id?: string
        }
        Returns: Json
      }
      get_interprofessional_referrals_for_interface: {
        Args: {
          p_direction?: string
          p_status?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          referral_id: string
          patient_id: string
          patient_name: string
          patient_number: string | null
          cms: string | null
          requesting_professional_id: string
          requesting_professional_name: string
          origin_specialty_id: string | null
          origin_specialty_name: string | null
          requested_specialty_id: string
          requested_specialty_name: string
          target_professional_id: string | null
          target_professional_name: string | null
          operational_reason: string
          response: string | null
          status: string
          direction: string
          source_appointment_id: string | null
          created_at: string
          updated_at: string
          approved_at: string | null
          completed_at: string | null
          cancelled_at: string | null
          last_action: string | null
          total_count: number
        }[]
      }
      get_interprofessional_referral_events_for_interface: {
        Args: { p_referral_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          event_id: string
          referral_id: string
          event_type: string
          from_status: string | null
          to_status: string
          detail: string | null
          actor_name: string
          actor_role: string | null
          created_at: string
        }[]
      }
      update_interprofessional_referral_for_interface: {
        Args: {
          p_referral_id: string
          p_action: string
          p_detail?: string
          p_target_professional_id?: string
        }
        Returns: Json
      }
      get_my_assistential_specialties_for_interface: {
        Args: Record<never, never>
        Returns: {
          specialty_id: string
          specialty_name: string
          is_current_context: boolean
        }[]
      }
      search_my_patients_for_interface: {
        Args: { p_query: string; p_limit?: number; p_offset?: number }
        Returns: {
          patient_id: string
          full_name: string
          patient_number: string | null
          cms: string | null
          status: string
          total_count: number
        }[]
      }
      get_agenda_for_interface: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_professional_id?: string
        }
        Returns: {
          appointment_id: string
          patient_id: string
          patient_name: string
          patient_number: string | null
          professional_id: string
          professional_name: string
          specialty_name: string | null
          appointment_date: string
          appointment_end: string | null
          appointment_type: string
          attendance_status: string
          general_notes: string | null
          rescheduled_from_id: string | null
          reschedule_reason: string | null
          reschedule_origin: string | null
        }[]
      }
      create_patient_for_interface: {
        Args: {
          p_full_name: string
          p_birth_date: string
          p_cms: string | null
          p_sex: string | null
          p_phone: string | null
          p_phone_secondary: string | null
          p_address: string | null
          p_capo_start_date: string | null
          p_operational_notes: string | null
          p_origin: string | null
        }
        Returns: {
          patient_id: string
          patient_number: string
          full_name: string
          cms: string
          birth_date: string
          origin: string
          status: string
          created_at: string
        }[]
      }
      get_available_appointment_slots: {
        Args: { p_professional_id: string; p_date: string }
        Returns: {
          professional_id: string
          slot_date: string
          slot_time: string
          slot_start: string
          slot_end: string
          duration_minutes: number
        }[]
      }
      create_appointment_for_interface: {
        Args: {
          p_patient_id: string
          p_professional_id: string
          p_slot_start: string
          p_appointment_type: string
          p_general_notes: string | null
          p_operational_origin: string | null
        }
        Returns: Json
      }
      get_reschedulable_appointments: {
        Args: {
          p_patient_id: string
          p_professional_id: string
          p_date: string
          p_limit: number
        }
        Returns: {
          appointment_id: string
          patient_id: string
          patient_name: string
          patient_number: string
          cms: string
          professional_id: string
          professional_name: string
          appointment_date: string
          appointment_end: string
          appointment_type: string
          attendance_status: string
          total_count: number
        }[]
      }
      reschedule_appointment_for_interface: {
        Args: {
          p_appointment_id: string
          p_new_professional_id: string
          p_new_slot_start: string
          p_reason: string
          p_origin: string
          p_new_notes: string
        }
        Returns: Json
      }
      create_agenda_block_for_interface: {
        Args: {
          p_agenda_config_id: string
          p_weekday: number
          p_specific_date: string
          p_start_time: string
          p_end_time: string
          p_block_type: string
          p_description: string
          p_confirm_overlap: boolean
          p_confirm_affected: boolean
          p_reschedule_instructions: string
        }
        Returns: Json
      }
      create_agenda_exception_for_interface: {
        Args: {
          p_agenda_config_id: string
          p_exception_date: string
          p_exception_type: string
          p_start_time: string
          p_end_time: string
          p_description: string
          p_confirm_conflict: boolean
        }
        Returns: Json
      }
      get_scheduling_catalog: {
        Args: Record<never, never>
        Returns: Json
      }
      get_agenda_configuration_for_interface: {
        Args: { p_professional_id: string }
        Returns: Json
      }
      get_my_specialty_operational_report_for_interface: {
        Args: {
          p_specialty_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: Json
      }
      get_technical_dashboard_for_interface: {
        Args: {
          p_start_at: string
          p_end_at: string
          p_recent_limit?: number
        }
        Returns: Json
      }
      get_technical_system_status_for_interface: {
        Args: Record<never, never>
        Returns: Json
      }
      get_technical_integrations_for_interface: {
        Args: Record<never, never>
        Returns: Json
      }
      get_technical_runtime_logs_for_interface: {
        Args: {
          p_start_at: string
          p_end_at: string
          p_severity?: string
          p_component?: string
          p_event_code?: string
          p_correlation_id?: string
          p_support_request_id?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          occurred_at: string
          severity: string
          component: string
          operation_name: string | null
          event_code: string | null
          result: string
          technical_message: string | null
          correlation_id: string | null
          actor_account_id: string | null
          support_request_id: string | null
          duration_ms: number | null
          total_count: number
        }[]
      }
      get_technical_support_requests_for_interface: {
        Args: { p_status?: string; p_limit?: number; p_offset?: number }
        Returns: {
          request_id: string
          requester_username: string
          assigned_username: string | null
          category: string
          subject: string
          description: string
          priority: string
          status: string
          technical_response: string | null
          requires_user_test: boolean
          user_test_result: string | null
          created_at: string
          updated_at: string
          started_at: string | null
          resolved_at: string | null
          total_count: number
        }[]
      }
      get_technical_support_history_for_interface: {
        Args: { p_request_id: string }
        Returns: Json
      }
      get_family_context_for_interface: {
        Args: { p_patient_id: string }
        Returns: {
          active_link: Record<string, Json> | null
          history: Record<string, Json>[]
          can_admin_correct: boolean
          can_operate: boolean
        }[]
      }
      create_family_link_for_interface: {
        Args: {
          p_patient_id: string
          p_relationship: string
          p_psychological_interest: string
          p_existing_family_member_id: string | null
          p_full_name: string | null
          p_phone: string | null
          p_email: string | null
          p_birth_date: string | null
          p_address: string | null
        }
        Returns: Json
      }
      replace_family_link_for_interface: {
        Args: {
          p_patient_id: string
          p_relationship: string
          p_psychological_interest: string
          p_existing_family_member_id: string | null
          p_full_name: string | null
          p_phone: string | null
          p_email: string | null
          p_birth_date: string | null
          p_address: string | null
          p_unlink_reason: string
        }
        Returns: Json
      }
      close_family_link_for_interface: {
        Args: { p_link_id: string; p_reason: string }
        Returns: Json
      }
      update_family_link_operational_for_interface: {
        Args: {
          p_link_id: string
          p_relationship: string | null
          p_psychological_interest: string | null
        }
        Returns: Json
      }
      search_family_members_for_interface: {
        Args: { p_query: string; p_limit: number }
        Returns: {
          id: string
          full_name: string
          phone: string | null
          email: string | null
          birth_date: string | null
          address: string | null
        }[]
      }
      create_psychology_request_for_interface: {
        Args: { p_link_id: string }
        Returns: Json
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
