import { useState, useEffect } from 'react'
import { X, Plus, Building2, User as UserIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '../../utils/format'
import { NewUserModal } from './NewUserModal'
import { NewPropertyModal } from './NewPropertyModal'
import type { User, Property } from '../../types/database'

interface NewLoanModalProps {
  isOpen: boolean
  onClose: () => void
}

export function NewLoanModal({ isOpen, onClose }: NewLoanModalProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [showNewPropertyModal, setShowNewPropertyModal] = useState(false)
  
  const [formData, setFormData] = useState({
    borrower_id: '',
    property_id: '',
    requested_amount: '',
    monthly_interest_rate: '2', // Tasa mensual total
    proyecty_commission_rate: '0.5', // Comisión mensual Proyecty
    term_months: '12',
    payment_day: '28',
    funding_deadline: '',
    notes: '',
  })

  // Obtener usuarios tipo deudor
  const { data: borrowers } = useQuery({
    queryKey: ['borrowers'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, document_number, email')
        .in('user_type', ['borrower', 'both'])
        .eq('is_active', true)
        .order('full_name')
      return data as Pick<User, 'id' | 'full_name' | 'document_number' | 'email'>[]
    },
    enabled: isOpen,
  })

  // Obtener propiedades
  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, property_name, property_type, address, appraisal_value')
        .order('property_name')
      return data as Pick<Property, 'id' | 'property_name' | 'property_type' | 'address' | 'appraisal_value'>[]
    },
    enabled: isOpen,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Calcular LTV cuando cambia monto o propiedad
  const selectedProperty = properties?.find(p => p.id === formData.property_id)
  const requestedAmount = parseFloat(formData.requested_amount) || 0
  const ltvRatio = selectedProperty?.appraisal_value 
    ? ((requestedAmount / selectedProperty.appraisal_value) * 100).toFixed(1)
    : null

  // Calcular tasa mensual del inversionista
  const monthlyRate = parseFloat(formData.monthly_interest_rate) || 0
  const proyectyRate = parseFloat(formData.proyecty_commission_rate) || 0
  const investorMonthlyRate = monthlyRate - proyectyRate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.borrower_id) {
        throw new Error('Debe seleccionar un deudor')
      }
      if (!formData.property_id) {
        throw new Error('Debe seleccionar una propiedad')
      }
      if (!formData.requested_amount || parseFloat(formData.requested_amount) <= 0) {
        throw new Error('El monto debe ser mayor a 0')
      }

      // Generar código de préstamo
      const { data: loanCode } = await supabase.rpc('generate_loan_code')

      const { error: insertError } = await supabase
        .from('loans')
        .insert([{
          loan_code: loanCode,
          borrower_id: formData.borrower_id,
          property_id: formData.property_id,
          requested_amount: parseFloat(formData.requested_amount),
          current_balance: 0, // Saldo inicia en 0, se actualizará al desembolsar
          disbursed_amount: 0, // Aún no se ha desembolsado
          annual_interest_rate: monthlyRate * 12, // Guardamos anual para compatibilidad
          proyecty_commission_rate: proyectyRate * 12,
          investor_return_rate: investorMonthlyRate * 12,
          term_months: parseInt(formData.term_months),
          payment_day: parseInt(formData.payment_day),
          funding_deadline: formData.funding_deadline || null,
          ltv_ratio: ltvRatio ? parseFloat(ltvRatio) : null,
          notes: formData.notes || null,
          status: 'draft',
        }])

      if (insertError) throw insertError

      // Refrescar listas
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      queryClient.invalidateQueries({ queryKey: ['loans-export'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      
      onClose()
      // Reset form
      setFormData({
        borrower_id: '',
        property_id: '',
        requested_amount: '',
        monthly_interest_rate: '2',
        proyecty_commission_rate: '0.5',
        term_months: '12',
        payment_day: '28',
        funding_deadline: '',
        notes: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear hipoteca')
    } finally {
      setLoading(false)
    }
  }

  // Refrescar listas cuando se crea un usuario o propiedad
  useEffect(() => {
    if (isOpen) {
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    }
  }, [isOpen, queryClient])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-semibold text-gray-900">Nueva Hipoteca</h2>
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

              {/* Deudor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Deudor (Cliente) *</label>
                  <button
                    type="button"
                    onClick={() => setShowNewUserModal(true)}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Deudor
                  </button>
                </div>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    name="borrower_id"
                    value={formData.borrower_id}
                    onChange={handleChange}
                    className="input pl-10"
                    required
                  >
                    <option value="">Seleccionar deudor...</option>
                    {borrowers?.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} {user.document_number ? `- ${user.document_number}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Propiedad */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Propiedad en Garantía *</label>
                  <button
                    type="button"
                    onClick={() => setShowNewPropertyModal(true)}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Propiedad
                  </button>
                </div>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    name="property_id"
                    value={formData.property_id}
                    onChange={handleChange}
                    className="input pl-10"
                    required
                  >
                    <option value="">Seleccionar propiedad...</option>
                    {properties?.map(prop => (
                      <option key={prop.id} value={prop.id}>
                        {prop.property_name} - {prop.property_type} ({prop.address})
                        {prop.appraisal_value && ` - Avalúo: ${formatCurrency(prop.appraisal_value)}`}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedProperty?.appraisal_value && (
                  <p className="text-sm text-gray-500 mt-1">
                    Valor del avalúo: {formatCurrency(selectedProperty.appraisal_value)}
                  </p>
                )}
              </div>

              {/* Monto y Plazo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Monto Solicitado (COP) *</label>
                  <input
                    type="number"
                    name="requested_amount"
                    value={formData.requested_amount}
                    onChange={handleChange}
                    className="input"
                    placeholder="50000000"
                    min="1000000"
                    step="1000000"
                    required
                  />
                  {requestedAmount > 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      {formatCurrency(requestedAmount)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="label">Plazo (Meses) *</label>
                  <select
                    name="term_months"
                    value={formData.term_months}
                    onChange={handleChange}
                    className="input"
                    required
                  >
                    <option value="6">6 meses</option>
                    <option value="12">12 meses</option>
                    <option value="18">18 meses</option>
                    <option value="24">24 meses</option>
                    <option value="36">36 meses</option>
                    <option value="48">48 meses</option>
                    <option value="60">60 meses</option>
                  </select>
                </div>

                <div>
                  <label className="label">Día de Pago</label>
                  <select
                    name="payment_day"
                    value={formData.payment_day}
                    onChange={handleChange}
                    className="input"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>Día {day}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Día 1-28 (evita problemas con febrero)</p>
                </div>
              </div>

              {/* Tasas Mensuales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Tasa Mensual Total (%) *</label>
                  <input
                    type="number"
                    name="monthly_interest_rate"
                    value={formData.monthly_interest_rate}
                    onChange={handleChange}
                    className="input"
                    min="0.5"
                    max="5"
                    step="0.1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">= {(monthlyRate * 12).toFixed(1)}% anual</p>
                </div>

                <div>
                  <label className="label">Comisión Proyecty Mensual (%)</label>
                  <input
                    type="number"
                    name="proyecty_commission_rate"
                    value={formData.proyecty_commission_rate}
                    onChange={handleChange}
                    className="input"
                    min="0"
                    max="2"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="label">Tasa Inversionista Mensual (%)</label>
                  <input
                    type="number"
                    value={investorMonthlyRate.toFixed(2)}
                    className="input bg-gray-50"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">= {(investorMonthlyRate * 12).toFixed(1)}% anual</p>
                </div>
              </div>

              {/* LTV Indicator */}
              {ltvRatio && (
                <div className={`p-4 rounded-lg ${parseFloat(ltvRatio) > 70 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                  <p className="text-sm">
                    <span className="font-medium">Loan-to-Value (LTV):</span>{' '}
                    <span className={parseFloat(ltvRatio) > 70 ? 'text-yellow-700' : 'text-green-700'}>
                      {ltvRatio}%
                    </span>
                  </p>
                  {parseFloat(ltvRatio) > 70 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⚠️ LTV superior al 70% - Mayor riesgo
                    </p>
                  )}
                </div>
              )}

              {/* Fecha límite de recaudación */}
              <div>
                <label className="label">Fecha Límite de Recaudación</label>
                <input
                  type="date"
                  name="funding_deadline"
                  value={formData.funding_deadline}
                  onChange={handleChange}
                  className="input w-auto"
                />
              </div>

              {/* Notas */}
              <div>
                <label className="label">Notas</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="input min-h-[80px]"
                  placeholder="Observaciones sobre este préstamo..."
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
                  {loading ? 'Creando...' : 'Crear Hipoteca'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal para crear nuevo deudor */}
      <NewUserModal
        isOpen={showNewUserModal}
        onClose={() => setShowNewUserModal(false)}
        defaultType="borrower"
      />

      {/* Modal para crear nueva propiedad */}
      <NewPropertyModal
        isOpen={showNewPropertyModal}
        onClose={() => setShowNewPropertyModal(false)}
      />
    </>
  )
}
