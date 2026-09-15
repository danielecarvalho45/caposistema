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
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
