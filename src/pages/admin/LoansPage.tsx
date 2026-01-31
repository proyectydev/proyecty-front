import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Plus, Search, Filter, Eye, Edit, FileText, DollarSign, Trash2 } from 'lucide-react'
import { formatCurrency } from '../../utils/format'
import { NewLoanModal, NewTransactionModal } from '../../components/modals'
import type { LoanSummary, Loan } from '../../types/database'

const statusLabels: Record<string, { label: string; class: string }> = {
  draft: { label: 'Borrador', class: 'badge-gray' },
  fundraising: { label: 'Recaudando', class: 'badge-info' },
  funded: { label: 'Fondeado', class: 'badge-info' },
  disbursed: { label: 'Desembolsado', class: 'badge-success' },
  current: { label: 'Al día', class: 'badge-success' },
  overdue: { label: 'En mora', class: 'badge-danger' },
  paid_off: { label: 'Pagado', class: 'badge-gray' },
  defaulted: { label: 'Impago', class: 'badge-danger' },
  cancelled: { label: 'Cancelado', class: 'badge-gray' },
  deleted: { label: 'Eliminado', class: 'badge-gray' },
}

export function LoansPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showNewLoanModal, setShowNewLoanModal] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [selectedLoanForTransaction, setSelectedLoanForTransaction] = useState<Loan | null>(null)
  
  // Estados para editar hipoteca
  const [showEditLoanModal, setShowEditLoanModal] = useState(false)
  const [selectedLoanForEdit, setSelectedLoanForEdit] = useState<LoanSummary | null>(null)
  
  // Estados para eliminar hipoteca
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedLoanForDelete, setSelectedLoanForDelete] = useState<LoanSummary | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { data: loans, isLoading } = useQuery({
    queryKey: ['loans', search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('v_loans_summary')
        .select('*')
        .neq('status', 'deleted') // No mostrar eliminados
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`loan_code.ilike.%${search}%,borrower_name.ilike.%${search}%`)
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      return data as LoanSummary[]
    },
  })

  // Función para eliminar hipoteca (soft delete)
  async function handleDeleteLoan() {
    if (!selectedLoanForDelete) return
    setDeleting(true)
    
    try {
      const { error } = await supabase
        .from('loans')
        .update({ status: 'deleted' })
        .eq('id', selectedLoanForDelete.id)
      
      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      setShowDeleteModal(false)
      setSelectedLoanForDelete(null)
    } catch (err) {
      console.error('Error eliminando hipoteca:', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hipotecas</h1>
          <p className="text-gray-500 mt-1">
            Gestiona las hipotecas del sistema
          </p>
        </div>
        <button onClick={() => setShowNewLoanModal(true)} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Nueva Hipoteca
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código o deudor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input pl-10 pr-8 appearance-none"
              >
                <option value="">Todos los estados</option>
                <option value="draft">Borrador</option>
                <option value="fundraising">Recaudando</option>
                <option value="disbursed">Desembolsado</option>
                <option value="current">Al día</option>
                <option value="overdue">En mora</option>
                <option value="paid_off">Pagado</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando hipotecas...</p>
          </div>
        ) : loans && loans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Monto</th>
                  <th>Saldo</th>
                  <th>Tasa Mensual</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin/hipotecas/${loan.id}`)}>
                    <td>
                      <span className="font-medium text-primary-600">
                        {loan.loan_code}
                      </span>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium">{loan.borrower_name}</p>
                        <p className="text-xs text-gray-500">{loan.property_name}</p>
                      </div>
                    </td>
                    <td>{formatCurrency(loan.disbursed_amount || loan.requested_amount)}</td>
                    <td>{formatCurrency(loan.current_balance)}</td>
                    <td>{(loan.annual_interest_rate / 12).toFixed(2)}%</td>
                    <td>
                      <span className={statusLabels[loan.status]?.class || 'badge-gray'}>
                        {statusLabels[loan.status]?.label || loan.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/hipotecas/${loan.id}`) }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                          title="Ver Detalle"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation()
                            setSelectedLoanForEdit(loan)
                            setShowEditLoanModal(true)
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                          title="Editar"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedLoanForTransaction(loan as unknown as Loan)
                            setShowTransactionModal(true)
                          }}
                          className="p-2 hover:bg-green-100 rounded-lg transition-colors" 
                          title="Registrar Pago"
                        >
                          <DollarSign className="w-4 h-4 text-green-600" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedLoanForDelete(loan)
                            setShowDeleteModal(true)
                          }}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors" 
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-gray-500 mt-4">No hay hipotecas registradas</p>
            <button onClick={() => setShowNewLoanModal(true)} className="btn-primary mt-4">
              <Plus className="w-5 h-5 mr-2" />
              Crear primera hipoteca
            </button>
          </div>
        )}
      </div>

      {/* Modales */}
      <NewLoanModal 
        isOpen={showNewLoanModal} 
        onClose={() => setShowNewLoanModal(false)} 
      />
      <NewTransactionModal 
        isOpen={showTransactionModal} 
        onClose={() => {
          setShowTransactionModal(false)
          setSelectedLoanForTransaction(null)
        }}
        preselectedLoan={selectedLoanForTransaction}
      />
      
      {/* Modal Editar Hipoteca */}
      {showEditLoanModal && selectedLoanForEdit && (
        <EditLoanModal
          loan={selectedLoanForEdit}
          onClose={() => {
            setShowEditLoanModal(false)
            setSelectedLoanForEdit(null)
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['loans'] })
            setShowEditLoanModal(false)
            setSelectedLoanForEdit(null)
          }}
        />
      )}
      
      {/* Modal Eliminar Hipoteca */}
      {showDeleteModal && selectedLoanForDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-center mb-2">Eliminar Hipoteca</h2>
            <p className="text-gray-600 text-center mb-2">
              ¿Estás seguro de eliminar la hipoteca <strong>{selectedLoanForDelete.loan_code}</strong>?
            </p>
            <p className="text-sm text-gray-500 text-center mb-4">
              Cliente: {selectedLoanForDelete.borrower_name}<br/>
              Monto: {formatCurrency(selectedLoanForDelete.requested_amount)}
            </p>
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg mb-6">
              ⚠️ La hipoteca será marcada como eliminada y no aparecerá en las listas. Los registros asociados (inversiones, transacciones) se mantendrán para historial.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedLoanForDelete(null)
                }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteLoan}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex-1"
              >
                {deleting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Componente Modal para editar hipoteca
function EditLoanModal({ 
  loan, 
  onClose, 
  onSuccess 
}: { 
  loan: LoanSummary
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    requested_amount: loan.requested_amount.toString(),
    monthly_interest_rate: (loan.annual_interest_rate / 12).toFixed(2),
    proyecty_commission_rate: ((loan.proyecty_commission_rate || 0) / 12).toFixed(2),
    term_months: loan.term_months.toString(),
    payment_day: loan.payment_day.toString(),
    notes: loan.notes || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Calcular tasa del inversionista
  const monthlyRate = parseFloat(formData.monthly_interest_rate) || 0
  const proyectyRate = parseFloat(formData.proyecty_commission_rate) || 0
  const investorRate = monthlyRate - proyectyRate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (proyectyRate >= monthlyRate) {
        throw new Error('La comisión de Proyecty debe ser menor a la tasa total')
      }

      const { error: updateError } = await supabase
        .from('loans')
        .update({
          requested_amount: parseFloat(formData.requested_amount),
          annual_interest_rate: monthlyRate * 12,
          proyecty_commission_rate: proyectyRate * 12,
          investor_return_rate: investorRate * 12,
          term_months: parseInt(formData.term_months),
          payment_day: parseInt(formData.payment_day),
          notes: formData.notes || null,
        })
        .eq('id', loan.id)

      if (updateError) throw updateError

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Editar Hipoteca</h2>
              <p className="text-sm text-gray-500">{loan.loan_code} - {loan.borrower_name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <FileText className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Monto */}
            <div>
              <label className="label">Monto Solicitado (COP) *</label>
              <input
                type="number"
                name="requested_amount"
                value={formData.requested_amount}
                onChange={handleChange}
                className="input"
                min="1000000"
                step="100000"
                required
              />
            </div>

            {/* Tasas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tasa Mensual Total (%) *</label>
                <input
                  type="number"
                  name="monthly_interest_rate"
                  value={formData.monthly_interest_rate}
                  onChange={handleChange}
                  className="input"
                  step="0.01"
                  min="0.1"
                  max="10"
                  required
                />
              </div>
              <div>
                <label className="label">Comisión Proyecty (%) *</label>
                <input
                  type="number"
                  name="proyecty_commission_rate"
                  value={formData.proyecty_commission_rate}
                  onChange={handleChange}
                  className="input"
                  step="0.01"
                  min="0"
                  max="5"
                  required
                />
              </div>
            </div>

            {/* Resumen de tasas */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Distribución mensual:</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Total Cliente</p>
                  <p className="font-semibold text-primary-600">{monthlyRate.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Inversionista</p>
                  <p className="font-semibold text-green-600">{investorRate.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Proyecty</p>
                  <p className="font-semibold text-amber-600">{proyectyRate.toFixed(2)}%</p>
                </div>
              </div>
            </div>

            {/* Plazo y día de pago */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Plazo (meses)</label>
                <input
                  type="number"
                  name="term_months"
                  value={formData.term_months}
                  onChange={handleChange}
                  className="input"
                  min="1"
                  max="120"
                />
              </div>
              <div>
                <label className="label">Día de Pago</label>
                <input
                  type="number"
                  name="payment_day"
                  value={formData.payment_day}
                  onChange={handleChange}
                  className="input"
                  min="1"
                  max="28"
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
                className="input"
                rows={3}
                placeholder="Observaciones..."
              />
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
