import { useState, useEffect, useRef } from 'react'
import { X, DollarSign, FileText, Upload, Trash2 } from 'lucide-react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  
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
          annual_interest_rate,
          monthly_interest_rate,
          proyecty_commission_rate,
          investor_return_rate,
          status,
          borrower:users!loans_borrower_id_fkey(id, full_name)
        `)
        .not('status', 'in', '("cancelled","paid_off","deleted")')
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
        annual_interest_rate: number
        monthly_interest_rate: number
        proyecty_commission_rate: number
        investor_return_rate: number
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
    { value: 'investor_deposit', label: 'Entrada de Inversión', description: 'Aporte de un inversionista al préstamo' },
    { value: 'loan_disbursement', label: 'Desembolso', description: 'Entrega del dinero al deudor' },
    { value: 'interest_payment', label: 'Recaudo de Intereses', description: 'Recaudo mensual de intereses' },
    { value: 'principal_payment', label: 'Recaudo de Capital', description: 'Abono/recaudo de capital del préstamo' },
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

  // Manejar selección de archivo de comprobante
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
      if (!validTypes.includes(file.type)) {
        setError('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, WebP) o PDF.')
        return
      }
      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 5MB.')
        return
      }
      
      setReceiptFile(file)
      setError('')
      
      // Crear preview si es imagen
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setReceiptPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        setReceiptPreview(null) // Es PDF, no hay preview
      }
    }
  }

  // Eliminar archivo seleccionado
  const handleRemoveFile = () => {
    setReceiptFile(null)
    setReceiptPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Subir comprobante a Supabase Storage
  const uploadReceipt = async (txCode: string): Promise<string | null> => {
    if (!receiptFile) return null
    
    const fileExt = receiptFile.name.split('.').pop()
    const fileName = `${txCode}.${fileExt}`
    const filePath = `receipts/${fileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, receiptFile, {
        cacheControl: '3600',
        upsert: true
      })
    
    if (uploadError) {
      console.error('Error uploading receipt:', uploadError)
      return null
    }
    
    // Obtener URL pública
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)
    
    return data.publicUrl
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

      const amount = parseFloat(formData.amount)
      const transactionType = formData.transaction_type

      // Generar código de transacción único
      const generateTxCode = () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
        return `TX-${year}${month}${day}-${random}`
      }

      // Calcular porciones según tipo de transacción
      let interestPortion = 0
      let principalPortion = 0
      
      if (transactionType === 'interest_payment') {
        interestPortion = amount
      } else if (transactionType === 'principal_payment') {
        principalPortion = amount
      }

      // Generar código único para la transacción principal
      const mainTxCode = generateTxCode()
      
      // Subir comprobante si existe
      const receiptUrl = await uploadReceipt(mainTxCode)

      // Crear transacción principal
      const { error: insertError } = await supabase
        .from('transactions')
        .insert([{
          transaction_code: mainTxCode,
          loan_id: formData.loan_id,
          user_id: formData.from_user_id || null,
          transaction_type: transactionType as 'investor_deposit' | 'loan_disbursement' | 'interest_payment' | 'principal_payment' | 'full_payment' | 'late_fee' | 'investor_return' | 'capital_return' | 'proyecty_commission' | 'adjustment' | 'refund',
          amount: amount,
          interest_portion: interestPortion,
          principal_portion: principalPortion,
          commission_portion: 0,
          payment_method: formData.payment_method,
          payment_reference: formData.reference_number || null,
          description: formData.notes || null,
          receipt_url: receiptUrl,
          status: 'completed',
          payment_date: new Date().toISOString(),
        }])

      if (insertError) throw insertError

      // === DISTRIBUCIÓN AUTOMÁTICA ===
      // Si es un recaudo de intereses, crear automáticamente las transacciones de distribución
      if (transactionType === 'interest_payment' && selectedLoan) {
        const totalRate = selectedLoan.monthly_interest_rate || (selectedLoan.annual_interest_rate / 12)
        const proyectyRate = selectedLoan.proyecty_commission_rate || 0
        const investorRate = selectedLoan.investor_return_rate || 0
        
        // Calcular distribución proporcional
        // Si totalRate = 2.4%, proyectyRate = 0.5%, investorRate = 1.9%
        // Entonces de $1,000,000: Proyecty = (0.5/2.4)*1M, Investor = (1.9/2.4)*1M
        
        if (totalRate > 0) {
          const proyectyAmount = Math.round((proyectyRate / totalRate) * amount)
          const investorAmount = Math.round((investorRate / totalRate) * amount)
          
          // Crear transacción de Comisión Proyecty
          if (proyectyAmount > 0) {
            await supabase
              .from('transactions')
              .insert([{
                transaction_code: generateTxCode(),
                loan_id: formData.loan_id,
                transaction_type: 'proyecty_commission',
                amount: proyectyAmount,
                interest_portion: 0,
                principal_portion: 0,
                commission_portion: proyectyAmount,
                payment_method: 'internal',
                description: `Comisión automática - ${((proyectyRate / totalRate) * 100).toFixed(1)}% del recaudo`,
                status: 'completed',
                payment_date: new Date().toISOString(),
              }])
          }
          
          // Crear transacción de Rendimiento Inversionista
          if (investorAmount > 0) {
            await supabase
              .from('transactions')
              .insert([{
                transaction_code: generateTxCode(),
                loan_id: formData.loan_id,
                transaction_type: 'investor_return',
                amount: investorAmount,
                interest_portion: 0,
                principal_portion: 0,
                commission_portion: 0,
                payment_method: 'internal',
                description: `Rendimiento automático - ${((investorRate / totalRate) * 100).toFixed(1)}% del recaudo`,
                status: 'completed',
                payment_date: new Date().toISOString(),
              }])
          }
        }
      }

      // Actualizar saldo del préstamo según tipo de transacción
      if (selectedLoan) {
        let newBalance = selectedLoan.current_balance || selectedLoan.requested_amount
        
        if (transactionType === 'loan_disbursement') {
          // Cuando se desembolsa, el saldo es el monto total prestado
          newBalance = selectedLoan.requested_amount
          
          await supabase
            .from('loans')
            .update({ 
              current_balance: newBalance,
              disbursed_amount: amount,
              status: 'disbursed'
            })
            .eq('id', formData.loan_id)
            
        } else if (transactionType === 'principal_payment') {
          // Cuando se recauda capital, se reduce el saldo
          newBalance = Math.max(0, newBalance - principalPortion)
          
          const updateData: { current_balance: number; status?: string } = { 
            current_balance: newBalance 
          }
          
          // Si el saldo llega a 0, marcar como pagado
          if (newBalance === 0) {
            updateData.status = 'paid_off'
          }
          
          await supabase
            .from('loans')
            .update(updateData)
            .eq('id', formData.loan_id)
        }
      }

      // Refrescar listas
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans-active'] })
      queryClient.invalidateQueries({ queryKey: ['period-transactions'] })
      
      onClose()
      // Reset form y archivo
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
      handleRemoveFile()
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
                  <p>
                    <span className="font-medium">Saldo Pendiente:</span>{' '}
                    <span className={selectedLoan.current_balance > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatCurrency(selectedLoan.current_balance || 0)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">(lo que debe el cliente)</span>
                  </p>
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

            {/* Calculadora de Intereses - Solo para pago de intereses */}
            {selectedLoan && formData.transaction_type === 'interest_payment' && selectedLoan.current_balance > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm font-medium text-blue-800 mb-3">💡 Cálculo de Intereses Sugerido</p>
                <div className="grid grid-cols-3 gap-3 text-center mb-3">
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-500">Saldo en Deuda</p>
                    <p className="font-semibold text-sm">{formatCurrency(selectedLoan.current_balance)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-500">Tasa Mensual</p>
                    <p className="font-semibold text-sm">{(selectedLoan.annual_interest_rate / 12).toFixed(2)}%</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-500">Interés a Pagar</p>
                    <p className="font-bold text-sm text-green-600">
                      {formatCurrency(Math.round(selectedLoan.current_balance * (selectedLoan.annual_interest_rate / 12 / 100)))}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const interest = Math.round(selectedLoan.current_balance * (selectedLoan.annual_interest_rate / 12 / 100))
                    setFormData(prev => ({ ...prev, amount: interest.toString() }))
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Aplicar monto sugerido
                </button>
              </div>
            )}

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

            {/* Comprobante */}
            <div>
              <label className="label">Comprobante (opcional)</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
              />
              
              {!receiptFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-primary-400 hover:bg-primary-50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-2 text-gray-500">
                    <Upload className="w-8 h-8" />
                    <span className="text-sm">Click para subir comprobante</span>
                    <span className="text-xs text-gray-400">JPG, PNG, WebP o PDF (máx. 5MB)</span>
                  </div>
                </button>
              ) : (
                <div className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-3">
                    {receiptPreview ? (
                      <img 
                        src={receiptPreview} 
                        alt="Preview" 
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-8 h-8 text-red-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">
                        {receiptFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(receiptFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
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
