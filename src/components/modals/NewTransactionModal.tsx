import { useState, useEffect } from 'react'
import { X, DollarSign, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '../../utils/format'
import type { User, Loan } from '../../types/database'

interface NewTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedLoan?: Loan | null
}

type TransactionType = 'investor_deposit' | 'loan_disbursement' | 'interest_payment' | 'principal_payment' | 'full_payment' | 'late_fee' | 'investor_return' | 'capital_return' | 'proyecty_commission' | 'adjustment' | 'refund'

export function NewTransactionModal({ isOpen, onClose, preselectedLoan }: NewTransactionModalProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    loan_id: preselectedLoan?.id || '',
    transaction_type: 'interest_payment' as TransactionType,
    amount: '',
    from_user_id: '',
    to_user_id: '',
    payment_method: 'transfer',
    reference_number: '',
    notes: '',
  })

  // Actualizar loan_id cuando cambia preselectedLoan
  useEffect(() => {
    if (preselectedLoan) {
      setFormData(prev => ({
        ...prev,
        loan_id: preselectedLoan.id,
      }))
    }
  }, [preselectedLoan])

  // Obtener préstamos activos
  const { data: loans } = useQuery({
    queryKey: ['loans-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('loans')
        .select(`
          id, 
          loan_code, 
          requested_amount,
          current_balance,
          status,
          borrower:users!loans_borrower_id_fkey(id, full_name)
        `)
        .not('status', 'in', '("cancelled","paid_off")')
        .order('loan_code')
      
      // Transformar borrower de array a objeto único
      return (data || []).map((loan: Record<string, unknown>) => ({
        ...loan,
        borrower: Array.isArray(loan.borrower) ? loan.borrower[0] : loan.borrower
      })) as { 
        id: string
        loan_code: string
        requested_amount: number
        current_balance: number
        status: string
        borrower: { id: string; full_name: string } | null
      }[]
    },
    enabled: isOpen,
  })

  // Obtener usuarios para from/to
  const { data: users } = useQuery({
    queryKey: ['users-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, user_type')
        .eq('is_active', true)
        .order('full_name')
      return data as Pick<User, 'id' | 'full_name' | 'user_type'>[]
    },
    enabled: isOpen,
  })

  const selectedLoan = loans?.find(l => l.id === formData.loan_id)

  const transactionTypes: { value: TransactionType; label: string; description: string }[] = [
    { value: 'investor_deposit', label: 'Depósito Inversión', description: 'Aporte de un inversionista al préstamo' },
    { value: 'loan_disbursement', label: 'Desembolso', description: 'Entrega del dinero al deudor' },
    { value: 'interest_payment', label: 'Pago de Intereses', description: 'Pago mensual de intereses' },
    { value: 'principal_payment', label: 'Abono a Capital', description: 'Abono al capital del préstamo' },
    { value: 'full_payment', label: 'Pago Total', description: 'Pago de cuota completa (capital + interés)' },
    { value: 'late_fee', label: 'Mora', description: 'Pago por intereses de mora' },
    { value: 'investor_return', label: 'Rendimiento Inversionista', description: 'Pago de rendimientos a inversionista' },
    { value: 'capital_return', label: 'Devolución Capital', description: 'Devolución de capital a inversionista' },
    { value: 'proyecty_commission', label: 'Comisión Proyecty', description: 'Comisión para Proyecty' },
    { value: 'adjustment', label: 'Ajuste', description: 'Ajuste manual de saldo' },
    { value: 'refund', label: 'Reembolso', description: 'Devolución de dinero' },
  ]

  const paymentMethods = [
    { value: 'transfer', label: 'Transferencia Bancaria' },
    { value: 'cash', label: 'Efectivo' },
    { value: 'check', label: 'Cheque' },
    { value: 'nequi', label: 'Nequi' },
    { value: 'daviplata', label: 'Daviplata' },
    { value: 'other', label: 'Otro' },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Auto-fill from/to users based on transaction type
  useEffect(() => {
    if (selectedLoan && formData.transaction_type) {
      switch (formData.transaction_type) {
        case 'investor_deposit':
          // From: Inversionista, To: Proyecty/Pool
          setFormData(prev => ({ ...prev, to_user_id: '' }))
          break
        case 'loan_disbursement':
          // From: Proyecty/Pool, To: Deudor
          if (selectedLoan.borrower?.id) {
            setFormData(prev => ({ ...prev, to_user_id: selectedLoan.borrower!.id }))
          }
          break
        case 'interest_payment':
        case 'principal_payment':
        case 'full_payment':
          // From: Deudor, To: Proyecty/Inversionistas
          if (selectedLoan.borrower?.id) {
            setFormData(prev => ({ ...prev, from_user_id: selectedLoan.borrower!.id }))
          }
          break
      }
    }
  }, [selectedLoan, formData.transaction_type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.loan_id) {
        throw new Error('Debe seleccionar un préstamo')
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('El monto debe ser mayor a 0')
      }

      // Generar código de transacción
      const { data: txCode } = await supabase.rpc('generate_transaction_code')

      const { error: insertError } = await supabase
        .from('transactions')
        .insert([{
          transaction_code: txCode,
          loan_id: formData.loan_id,
          user_id: formData.from_user_id || null,
          transaction_type: formData.transaction_type as 'investor_deposit' | 'loan_disbursement' | 'interest_payment' | 'principal_payment' | 'full_payment' | 'late_fee' | 'investor_return' | 'capital_return' | 'proyecty_commission' | 'adjustment' | 'refund',
          amount: parseFloat(formData.amount),
          interest_portion: 0,
          principal_portion: formData.transaction_type === 'principal_payment' ? parseFloat(formData.amount) : 0,
          commission_portion: 0,
          payment_method: formData.payment_method,
          payment_reference: formData.reference_number || null,
          description: formData.notes || null,
          status: 'completed',
          payment_date: new Date().toISOString(),
        }])

      if (insertError) throw insertError

      // Recalcular saldo del préstamo si es pago
      if (['principal_payment', 'full_payment'].includes(formData.transaction_type)) {
        await supabase.rpc('recalculate_loan_balance', { p_loan_id: formData.loan_id })
      }

      // Refrescar listas
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans-active'] })
      
      onClose()
      // Reset form
      setFormData({
        loan_id: '',
        transaction_type: 'interest_payment',
        amount: '',
        from_user_id: '',
        to_user_id: '',
        payment_method: 'transfer',
        reference_number: '',
        notes: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar transacción')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-xl font-semibold text-gray-900">Registrar Transacción</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Préstamo */}
            <div>
              <label className="label">Préstamo *</label>
              <select
                name="loan_id"
                value={formData.loan_id}
                onChange={handleChange}
                className="input"
                required
                disabled={!!preselectedLoan}
              >
                <option value="">Seleccionar préstamo...</option>
                {loans?.map(loan => (
                  <option key={loan.id} value={loan.id}>
                    {loan.loan_code} - {loan.borrower?.full_name} - {formatCurrency(loan.requested_amount)}
                  </option>
                ))}
              </select>
              {selectedLoan && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                  <p><span className="font-medium">Deudor:</span> {selectedLoan.borrower?.full_name}</p>
                  <p><span className="font-medium">Monto Original:</span> {formatCurrency(selectedLoan.requested_amount)}</p>
                  <p><span className="font-medium">Saldo Actual:</span> {formatCurrency(selectedLoan.current_balance || 0)}</p>
                  <p><span className="font-medium">Estado:</span> {selectedLoan.status}</p>
                </div>
              )}
            </div>

            {/* Tipo de Transacción */}
            <div>
              <label className="label">Tipo de Transacción *</label>
              <select
                name="transaction_type"
                value={formData.transaction_type}
                onChange={handleChange}
                className="input"
                required
              >
                {transactionTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                {transactionTypes.find(t => t.value === formData.transaction_type)?.description}
              </p>
            </div>

            {/* Monto y Método de Pago */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Monto (COP) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    className="input pl-10"
                    placeholder="1000000"
                    min="1"
                    required
                  />
                </div>
                {formData.amount && (
                  <p className="text-sm text-gray-500 mt-1">
                    {formatCurrency(parseFloat(formData.amount) || 0)}
                  </p>
                )}
              </div>

              <div>
                <label className="label">Método de Pago</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleChange}
                  className="input"
                >
                  {paymentMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Usuarios From/To */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">De (Origen)</label>
                <select
                  name="from_user_id"
                  value={formData.from_user_id}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Seleccionar...</option>
                  {users?.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.user_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Para (Destino)</label>
                <select
                  name="to_user_id"
                  value={formData.to_user_id}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Seleccionar...</option>
                  {users?.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.user_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Referencia */}
            <div>
              <label className="label">Número de Referencia</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="reference_number"
                  value={formData.reference_number}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="Ref. bancaria, # comprobante, etc."
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="label">Notas</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="input min-h-[80px]"
                placeholder="Observaciones sobre esta transacción..."
              />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Registrando...' : 'Registrar Transacción'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
