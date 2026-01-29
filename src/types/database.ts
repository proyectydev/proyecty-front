// Tipos generados para la base de datos de Proyecty
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          phone: string | null
          document_type: string
          document_number: string | null
          address: string | null
          city: string
          department: string
          user_type: 'investor' | 'borrower' | 'both' | 'admin'
          is_online_user: boolean
          is_verified: boolean
          is_active: boolean
          bank_name: string | null
          bank_account_type: string | null
          bank_account_number: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['users']['Row']> & {
          email: string
          full_name: string
          user_type: 'investor' | 'borrower' | 'both' | 'admin'
        }
        Update: Partial<Database['public']['Tables']['users']['Row']>
      }
      properties: {
        Row: {
          id: string
          property_name: string
          property_type: string
          address: string
          neighborhood: string | null
          city: string
          department: string
          matricula_inmobiliaria: string | null
          cedula_catastral: string | null
          appraisal_value: number | null
          appraisal_date: string | null
          commercial_value: number | null
          property_photos: Json
          documents: Json
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['properties']['Row']> & {
          property_name: string
          property_type: string
          address: string
          city: string
          department: string
        }
        Update: Partial<Database['public']['Tables']['properties']['Row']>
      }
      loans: {
        Row: {
          id: string
          loan_code: string
          borrower_id: string
          property_id: string
          requested_amount: number
          funded_amount: number
          disbursed_amount: number
          current_balance: number
          annual_interest_rate: number
          monthly_interest_rate: number
          proyecty_commission_rate: number
          investor_return_rate: number | null
          application_date: string
          funding_deadline: string | null
          disbursement_date: string | null
          start_date: string | null
          maturity_date: string | null
          term_months: number
          payment_day: number
          status: 'draft' | 'fundraising' | 'funded' | 'disbursed' | 'current' | 'overdue' | 'paid_off' | 'defaulted' | 'cancelled'
          ltv_ratio: number | null
          notes: string | null
          contract_url: string | null
          documents: Json
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['loans']['Row']> & {
          borrower_id: string
          property_id: string
          requested_amount: number
          annual_interest_rate: number
          term_months: number
        }
        Update: Partial<Database['public']['Tables']['loans']['Row']>
      }
      investments: {
        Row: {
          id: string
          loan_id: string
          investor_id: string
          committed_amount: number
          transferred_amount: number
          current_value: number | null
          participation_percentage: number | null
          investor_rate: number | null
          status: 'committed' | 'transferred' | 'active' | 'completed' | 'cancelled'
          commitment_date: string
          transfer_date: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['investments']['Row']> & {
          loan_id: string
          investor_id: string
          committed_amount: number
        }
        Update: Partial<Database['public']['Tables']['investments']['Row']>
      }
      transactions: {
        Row: {
          id: string
          transaction_code: string
          loan_id: string | null
          investment_id: string | null
          user_id: string | null
          transaction_type: 'investor_deposit' | 'loan_disbursement' | 'interest_payment' | 'principal_payment' | 'full_payment' | 'late_fee' | 'investor_return' | 'capital_return' | 'proyecty_commission' | 'adjustment' | 'refund'
          amount: number
          interest_portion: number
          principal_portion: number
          commission_portion: number
          loan_balance_after: number | null
          payment_method: string | null
          payment_reference: string | null
          payment_date: string
          status: 'pending' | 'completed' | 'reversed' | 'cancelled'
          description: string | null
          receipt_url: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          is_edited: boolean
          original_amount: number | null
          edit_reason: string | null
          edited_at: string | null
          edited_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['transactions']['Row']> & {
          transaction_type: 'investor_deposit' | 'loan_disbursement' | 'interest_payment' | 'principal_payment' | 'full_payment' | 'late_fee' | 'investor_return' | 'capital_return' | 'proyecty_commission' | 'adjustment' | 'refund'
          amount: number
        }
        Update: Partial<Database['public']['Tables']['transactions']['Row']>
      }
      audit_log: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: string
          user_id: string | null
          user_email: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: Partial<Database['public']['Tables']['audit_log']['Row']> & {
          table_name: string
          record_id: string
          action: string
        }
        Update: Partial<Database['public']['Tables']['audit_log']['Row']>
      }
      system_config: {
        Row: {
          id: string
          config_key: string
          config_value: string
          description: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: Partial<Database['public']['Tables']['system_config']['Row']> & {
          config_key: string
          config_value: string
        }
        Update: Partial<Database['public']['Tables']['system_config']['Row']>
      }
    }
    Views: {
      v_loans_summary: {
        Row: Database['public']['Tables']['loans']['Row'] & {
          property_name: string
          property_address: string
          borrower_name: string
          borrower_document: string | null
          investor_count: number
          total_interest_paid: number
          total_principal_paid: number
        }
      }
      v_investor_portfolio: {
        Row: {
          investor_id: string
          investor_name: string
          investor_email: string
          active_loans: number
          total_invested: number
          current_portfolio_value: number
          total_returns_received: number
        }
      }
    }
    Functions: {
      generate_loan_code: {
        Args: Record<string, never>
        Returns: string
      }
      generate_transaction_code: {
        Args: Record<string, never>
        Returns: string
      }
      recalculate_loan_balance: {
        Args: { p_loan_id: string }
        Returns: void
      }
    }
  }
}

// Tipos de ayuda
export type User = Database['public']['Tables']['users']['Row']
export type Property = Database['public']['Tables']['properties']['Row']
export type Loan = Database['public']['Tables']['loans']['Row']
export type Investment = Database['public']['Tables']['investments']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type LoanSummary = Database['public']['Views']['v_loans_summary']['Row']
export type InvestorPortfolio = Database['public']['Views']['v_investor_portfolio']['Row']
