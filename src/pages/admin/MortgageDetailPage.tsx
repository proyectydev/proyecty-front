import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  ArrowLeft, Building2, User, DollarSign, 
  Percent, Users, Plus, FileText, Download, Edit,
  Clock, TrendingUp, MoreVertical, Trash2
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/format'
import { NewTransactionModal } from '../../components/modals'

// Estados de la hipoteca
const loanStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Borrador', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  review: { label: 'En Revisión', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  fundraising: { label: 'Recaudando', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  funding: { label: 'Recaudando', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  funded: { label: 'Fondeada', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  disbursed: { label: 'Desembolsada', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  active: { label: 'Activa', color: 'text-green-600', bgColor: 'bg-green-100' },
  current: { label: 'Al Día', color: 'text-green-600', bgColor: 'bg-green-100' },
  overdue: { label: 'En Mora', color: 'text-red-600', bgColor: 'bg-red-100' },
  paid_off: { label: 'Pagada', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  defaulted: { label: 'Impago', color: 'text-red-700', bgColor: 'bg-red-100' },
  cancelled: { label: 'Cancelada', color: 'text-gray-500', bgColor: 'bg-gray-100' },
}

// Tipos de transacción en español
const transactionTypeLabels: Record<string, string> = {
  investor_deposit: 'Entrada de Inversión',
  loan_disbursement: 'Desembolso',
  interest_payment: 'Recaudo de Intereses',
  principal_payment: 'Recaudo de Capital',
  investor_return: 'Rendimiento Inversionista',
  proyecty_commission: 'Comisión Proyecty',
  adjustment: 'Ajuste',
  refund: 'Reembolso',
}

export function MortgageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [showAddInvestorModal, setShowAddInvestorModal] = useState(false)
  const [showChangeStatusModal, setShowChangeStatusModal] = useState(false)
  
  // Estados para editar/eliminar inversión
  const [investmentMenuOpen, setInvestmentMenuOpen] = useState<string | null>(null)
  const [showEditInvestmentModal, setShowEditInvestmentModal] = useState(false)
  const [showDeleteInvestmentModal, setShowDeleteInvestmentModal] = useState(false)
  const [selectedInvestment, setSelectedInvestment] = useState<{
    id: string
    investor_id: string
    investor_name: string
    committed_amount: number
    transferred_amount: number | null
  } | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [deletingInvestment, setDeletingInvestment] = useState(false)
  const [savingInvestment, setSavingInvestment] = useState(false)

  // Obtener datos de la hipoteca
  const { data: loan, isLoading } = useQuery({
    queryKey: ['loan-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  // Obtener deudor
  const { data: borrower } = useQuery({
    queryKey: ['borrower', loan?.borrower_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', loan?.borrower_id)
        .single()
      return data
    },
    enabled: !!loan?.borrower_id,
  })

  // Obtener propiedad
  const { data: property } = useQuery({
    queryKey: ['property', loan?.property_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('id', loan?.property_id)
        .single()
      return data
    },
    enabled: !!loan?.property_id,
  })

  // Obtener inversiones
  const { data: investments } = useQuery({
    queryKey: ['investments', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('investments')
        .select(`
          *,
          investor:users!investments_investor_id_fkey(id, full_name, email, phone)
        `)
        .eq('loan_id', id)
        .order('created_at', { ascending: false })
      return data
    },
    enabled: !!id,
  })

  // Obtener transacciones
  const { data: transactions } = useQuery({
    queryKey: ['transactions', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('loan_id', id)
        .order('payment_date', { ascending: false })
        .limit(20)
      return data
    },
    enabled: !!id,
  })

  // Cambiar estado de la hipoteca
  async function changeStatus(newStatus: string) {
    if (!id || !loan) return
    
    // Preparar los datos de actualización
    const updateData: Record<string, unknown> = { status: newStatus }
    
    // Si cambia a "disbursed" y no tiene valores, inicializar current_balance y disbursed_amount
    if (newStatus === 'disbursed') {
      if (!loan.disbursed_amount || loan.disbursed_amount === 0) {
        updateData.disbursed_amount = loan.requested_amount
      }
      if (!loan.current_balance || loan.current_balance === 0) {
        updateData.current_balance = loan.requested_amount
      }
    }
    
    const { error } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', id)
    
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['loan-detail', id] })
      queryClient.invalidateQueries({ queryKey: ['loans'] })
      setShowChangeStatusModal(false)
    }
  }

  // Eliminar inversión
  async function handleDeleteInvestment() {
    if (!selectedInvestment) return
    setDeletingInvestment(true)
    
    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', selectedInvestment.id)
      
      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['investments', id] })
      setShowDeleteInvestmentModal(false)
      setSelectedInvestment(null)
    } catch (err) {
      console.error('Error eliminando inversión:', err)
    } finally {
      setDeletingInvestment(false)
    }
  }

  // Editar inversión
  async function handleEditInvestment() {
    if (!selectedInvestment || !editAmount) return
    setSavingInvestment(true)
    
    try {
      const newAmount = parseFloat(editAmount.replace(/[,.]/g, ''))
      if (isNaN(newAmount) || newAmount <= 0) {
        throw new Error('Monto inválido')
      }
      
      const { error } = await supabase
        .from('investments')
        .update({ 
          committed_amount: newAmount,
          transferred_amount: newAmount // También actualizar el transferido
        })
        .eq('id', selectedInvestment.id)
      
      if (error) throw error
      
      queryClient.invalidateQueries({ queryKey: ['investments', id] })
      setShowEditInvestmentModal(false)
      setSelectedInvestment(null)
      setEditAmount('')
    } catch (err) {
      console.error('Error editando inversión:', err)
    } finally {
      setSavingInvestment(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-500 mt-4">Cargando hipoteca...</p>
      </div>
    )
  }

  if (!loan) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Hipoteca no encontrada</p>
        <button onClick={() => navigate('/admin/propiedades')} className="btn-primary mt-4">
          Volver a Propiedades
        </button>
      </div>
    )
  }

  const statusInfo = loanStatusConfig[loan.status] || loanStatusConfig.draft
  const totalFunded = investments?.reduce((sum, inv) => sum + (inv.transferred_amount || inv.committed_amount || 0), 0) || 0
  const fundingProgress = (totalFunded / loan.requested_amount) * 100
  const totalPaid = transactions?.filter(t => ['interest_payment', 'principal_payment', 'full_payment'].includes(t.transaction_type))
    .reduce((sum, t) => sum + t.amount, 0) || 0

  // Calcular tasas mensuales desde las anuales guardadas
  const monthlyRate = (loan.annual_interest_rate / 12).toFixed(2)
  const monthlyProyectyRate = (loan.proyecty_commission_rate / 12).toFixed(2)
  const monthlyInvestorRate = ((loan.investor_return_rate || 0) / 12).toFixed(2)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button 
          onClick={() => navigate('/admin/propiedades')}
          className="p-2 hover:bg-gray-100 rounded-lg w-fit"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{loan.loan_code}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <p className="text-gray-500 mt-1 text-sm">
            Creada el {formatDate(loan.created_at)}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={() => setShowChangeStatusModal(true)}
            className="btn-secondary text-sm"
          >
            <Edit className="w-4 h-4 mr-2" />
            Cambiar Estado
          </button>
          <button className="btn-secondary text-sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card">
          <div className="card-body p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-xl">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 truncate">Monto Hipoteca</p>
                <p className="text-base sm:text-xl font-bold truncate">{formatCurrency(loan.requested_amount)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-green-100 rounded-xl">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 truncate">Total Pagado</p>
                <p className="text-base sm:text-xl font-bold truncate">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-amber-100 rounded-xl">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 truncate">Saldo Pendiente</p>
                <p className="text-base sm:text-xl font-bold truncate">{formatCurrency(loan.current_balance || loan.requested_amount)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-xl">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 truncate">Inversionistas</p>
                <p className="text-base sm:text-xl font-bold">{investments?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progreso de Recaudación */}
          {['draft', 'fundraising', 'funding', 'review'].includes(loan.status) && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Progreso de Recaudación</h2>
              </div>
              <div className="card-body">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Recaudado</span>
                  <span className="font-medium">{fundingProgress.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, fundingProgress)}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 font-medium">{formatCurrency(totalFunded)}</span>
                  <span className="text-gray-500">de {formatCurrency(loan.requested_amount)}</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Faltan {formatCurrency(loan.requested_amount - totalFunded)} para completar
                </p>
              </div>
            </div>
          )}

          {/* Inversionistas */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="card-title">Inversionistas</h2>
              <button 
                onClick={() => setShowAddInvestorModal(true)}
                className="btn-primary text-sm py-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                Agregar Inversionista
              </button>
            </div>
            <div className="card-body">
              {investments && investments.length > 0 ? (
                <div className="space-y-3">
                  {investments.map((inv) => {
                    // El investor puede venir como objeto o como array dependiendo de la relación
                    const investorRaw = inv.investor as { id: string; full_name: string; email: string; phone: string } | { id: string; full_name: string; email: string; phone: string }[] | null
                    const investorData = Array.isArray(investorRaw) ? investorRaw[0] : investorRaw
                    const percentage = ((inv.committed_amount / loan.requested_amount) * 100).toFixed(1)
                    
                    return (
                      <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-3 relative">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-600 font-medium">
                              {investorData?.full_name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{investorData?.full_name || 'Inversionista'}</p>
                            <p className="text-sm text-gray-500 truncate">{investorData?.email || 'Sin email'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-left sm:text-right">
                            <p className="font-semibold">{formatCurrency(inv.committed_amount)}</p>
                            <p className="text-sm text-gray-500">{percentage}% del total</p>
                          </div>
                          {/* Menú de acciones */}
                          <div className="relative">
                            <button
                              onClick={() => setInvestmentMenuOpen(investmentMenuOpen === inv.id ? null : inv.id)}
                              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                            {investmentMenuOpen === inv.id && (
                              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border py-1 z-10">
                                <button
                                  onClick={() => {
                                    setSelectedInvestment({
                                      id: inv.id,
                                      investor_id: investorData?.id || '',
                                      investor_name: investorData?.full_name || 'Inversionista',
                                      committed_amount: inv.committed_amount,
                                      transferred_amount: inv.transferred_amount
                                    })
                                    setEditAmount(inv.committed_amount.toString())
                                    setShowEditInvestmentModal(true)
                                    setInvestmentMenuOpen(null)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Edit className="w-4 h-4" />
                                  Editar monto
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedInvestment({
                                      id: inv.id,
                                      investor_id: investorData?.id || '',
                                      investor_name: investorData?.full_name || 'Inversionista',
                                      committed_amount: inv.committed_amount,
                                      transferred_amount: inv.transferred_amount
                                    })
                                    setShowDeleteInvestmentModal(true)
                                    setInvestmentMenuOpen(null)
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto" />
                  <p className="text-gray-500 mt-2">No hay inversionistas registrados</p>
                  <button 
                    onClick={() => setShowAddInvestorModal(true)}
                    className="btn-primary mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar primer inversionista
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Últimos Movimientos */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="card-title">Últimos Movimientos</h2>
              <button 
                onClick={() => setShowTransactionModal(true)}
                className="btn-primary text-sm py-2"
              >
                <Plus className="w-4 h-4 mr-1" />
                Registrar Pago
              </button>
            </div>
            <div className="card-body">
              {transactions && transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 10).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{transactionTypeLabels[tx.transaction_type] || tx.transaction_type}</p>
                        <p className="text-xs text-gray-500">{formatDate(tx.payment_date)}</p>
                      </div>
                      <p className={`font-semibold ${
                        ['interest_payment', 'principal_payment', 'full_payment'].includes(tx.transaction_type)
                          ? 'text-green-600'
                          : 'text-gray-900'
                      }`}>
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto" />
                  <p className="text-gray-500 mt-2">No hay movimientos registrados</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna Lateral */}
        <div className="space-y-6">
          {/* Info de Tasas */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Tasas y Condiciones
              </h2>
            </div>
            <div className="card-body space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Tasa Mensual Total</span>
                <span className="font-semibold">{monthlyRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Comisión Proyecty</span>
                <span className="font-semibold">{monthlyProyectyRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tasa Inversionista</span>
                <span className="font-semibold text-green-600">{monthlyInvestorRate}%</span>
              </div>
              <hr />
              <div className="flex justify-between">
                <span className="text-gray-500">Plazo</span>
                <span className="font-semibold">{loan.term_months} meses</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Día de Pago</span>
                <span className="font-semibold">Día {loan.payment_day}</span>
              </div>
              {loan.ltv_ratio && (
                <div className="flex justify-between">
                  <span className="text-gray-500">LTV</span>
                  <span className={`font-semibold ${loan.ltv_ratio > 70 ? 'text-amber-600' : 'text-green-600'}`}>
                    {loan.ltv_ratio.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info del Cliente */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-2">
                <User className="w-5 h-5" />
                Cliente (Deudor)
              </h2>
            </div>
            <div className="card-body">
              {borrower ? (
                <div className="space-y-3">
                  <p className="font-semibold text-lg">{borrower.full_name}</p>
                  <p className="text-sm text-gray-500">{borrower.email}</p>
                  {borrower.phone && (
                    <p className="text-sm text-gray-500">{borrower.phone}</p>
                  )}
                  {borrower.document_number && (
                    <p className="text-sm text-gray-500">
                      {borrower.document_type}: {borrower.document_number}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Cargando...</p>
              )}
            </div>
          </div>

          {/* Info de la Propiedad */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Propiedad en Garantía
              </h2>
            </div>
            <div className="card-body">
              {property ? (
                <div className="space-y-3">
                  <p className="font-semibold">{property.property_name}</p>
                  <p className="text-sm text-gray-500">{property.address}</p>
                  <p className="text-sm text-gray-500">{property.city}, {property.department}</p>
                  {property.matricula_inmobiliaria && (
                    <p className="text-sm text-gray-500">
                      Matrícula: {property.matricula_inmobiliaria}
                    </p>
                  )}
                  {property.appraisal_value && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-500">Avalúo</p>
                      <p className="text-lg font-semibold">{formatCurrency(property.appraisal_value)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">Cargando...</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para registrar transacción */}
      <NewTransactionModal 
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        preselectedLoan={loan}
      />

      {/* Modal para agregar inversionista */}
      {showAddInvestorModal && (
        <AddInvestorModal 
          loanId={id!}
          requestedAmount={loan.requested_amount}
          fundedAmount={totalFunded}
          onClose={() => setShowAddInvestorModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['investments', id] })
            setShowAddInvestorModal(false)
          }}
        />
      )}

      {/* Modal para cambiar estado */}
      {showChangeStatusModal && (
        <ChangeStatusModal
          currentStatus={loan.status}
          onClose={() => setShowChangeStatusModal(false)}
          onChangeStatus={changeStatus}
        />
      )}

      {/* Modal para editar inversión */}
      {showEditInvestmentModal && selectedInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowEditInvestmentModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Editar Inversión</h2>
            <p className="text-gray-600 mb-4">
              Modificar el monto de inversión de <strong>{selectedInvestment.investor_name}</strong>
            </p>
            
            <div className="mb-4">
              <label className="label">Monto actual</label>
              <p className="text-lg font-semibold text-gray-500">
                {formatCurrency(selectedInvestment.committed_amount)}
              </p>
            </div>
            
            <div className="mb-6">
              <label className="label">Nuevo monto *</label>
              <input
                type="text"
                value={editAmount}
                onChange={(e) => {
                  // Solo permitir números
                  const value = e.target.value.replace(/[^\d]/g, '')
                  setEditAmount(value)
                }}
                className="input"
                placeholder="Ej: 5000000"
              />
              {editAmount && (
                <p className="text-sm text-gray-500 mt-1">
                  {formatCurrency(parseFloat(editAmount) || 0)}
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowEditInvestmentModal(false)
                  setSelectedInvestment(null)
                  setEditAmount('')
                }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button 
                onClick={handleEditInvestment}
                disabled={savingInvestment || !editAmount}
                className="btn-primary flex-1"
              >
                {savingInvestment ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para eliminar inversión */}
      {showDeleteInvestmentModal && selectedInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowDeleteInvestmentModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-center mb-2">Eliminar Inversión</h2>
            <p className="text-gray-600 text-center mb-4">
              ¿Estás seguro de eliminar la inversión de <strong>{selectedInvestment.investor_name}</strong> por <strong>{formatCurrency(selectedInvestment.committed_amount)}</strong>?
            </p>
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg mb-6">
              ⚠️ Esta acción recalculará automáticamente el monto total financiado de la hipoteca.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowDeleteInvestmentModal(false)
                  setSelectedInvestment(null)
                }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteInvestment}
                disabled={deletingInvestment}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex-1"
              >
                {deletingInvestment ? (
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

// Componente Modal para agregar inversionista
function AddInvestorModal({ 
  loanId, 
  requestedAmount, 
  fundedAmount,
  onClose, 
  onSuccess 
}: { 
  loanId: string
  requestedAmount: number
  fundedAmount: number
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [investorId, setInvestorId] = useState('')
  const [amount, setAmount] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const remaining = requestedAmount - fundedAmount

  // Obtener inversionistas disponibles (todos los usuarios pueden invertir)
  const { data: investors, isLoading: loadingInvestors } = useQuery({
    queryKey: ['investors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email, phone')
        .in('user_type', ['user', 'investor', 'both', 'admin'])
        .eq('is_active', true)
        .order('full_name')
      return data
    },
  })

  // Filtrar inversionistas por búsqueda
  const filteredInvestors = investors?.filter(inv => 
    inv.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const amountNum = parseFloat(amount)
      if (!investorId) throw new Error('Seleccione un inversionista')
      if (!amountNum || amountNum <= 0) throw new Error('Ingrese un monto válido')
      if (amountNum > remaining) throw new Error(`El monto máximo disponible es ${formatCurrency(remaining)}`)

      const { error: insertError } = await supabase
        .from('investments')
        .insert([{
          loan_id: loanId,
          investor_id: investorId,
          committed_amount: amountNum,
          transferred_amount: 0,
          status: 'committed',
          commitment_date: new Date().toISOString(),
        }])

      if (insertError) throw insertError

      // Actualizar funded_amount en el préstamo
      await supabase
        .from('loans')
        .update({ funded_amount: fundedAmount + amountNum })
        .eq('id', loanId)

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar inversionista')
    } finally {
      setLoading(false)
    }
  }

  const selectedInvestor = investors?.find(inv => inv.id === investorId)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-2">Agregar Inversionista</h2>
            <p className="text-sm text-gray-500 mb-4">
              Asigna un inversionista a esta hipoteca con el monto que desea aportar.
            </p>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            {/* Resumen de la hipoteca */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Monto Total</span>
                <span className="font-medium">{formatCurrency(requestedAmount)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Ya Fondeado</span>
                <span className="font-medium text-green-600">{formatCurrency(fundedAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Disponible</span>
                <span className="font-medium text-amber-600">{formatCurrency(remaining)}</span>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${(fundedAmount / requestedAmount) * 100}%` }}
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Buscar Inversionista *</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input mb-2"
                  placeholder="Buscar por nombre o email..."
                />
                
                {loadingInvestors ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : filteredInvestors && filteredInvestors.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto border rounded-lg">
                    {filteredInvestors.map(inv => (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => setInvestorId(inv.id)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b last:border-b-0 ${
                          investorId === inv.id ? 'bg-primary-50' : ''
                        }`}
                      >
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-600 font-medium">
                            {inv.full_name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{inv.full_name}</p>
                          <p className="text-sm text-gray-500 truncate">{inv.email}</p>
                        </div>
                        {investorId === inv.id && (
                          <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 border rounded-lg">
                    <p className="text-gray-500 text-sm">
                      {searchTerm 
                        ? 'No se encontraron inversionistas' 
                        : 'No hay inversionistas registrados'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Los usuarios tipo "Inversionista" o "Ambos" aparecerán aquí
                    </p>
                  </div>
                )}
              </div>

              {selectedInvestor && (
                <div className="bg-primary-50 rounded-lg p-3">
                  <p className="text-sm text-primary-700">
                    <strong>Seleccionado:</strong> {selectedInvestor.full_name}
                  </p>
                </div>
              )}

              <div>
                <label className="label">Monto a Invertir (COP) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input"
                  placeholder="Ej: 10000000"
                  min="100000"
                  max={remaining}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Mínimo $100,000 - Máximo {formatCurrency(remaining)}
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary flex-1" 
                  disabled={loading || !investorId || !amount}
                >
                  {loading ? 'Agregando...' : 'Agregar Inversionista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

// Componente Modal para cambiar estado
function ChangeStatusModal({ 
  currentStatus, 
  onClose, 
  onChangeStatus 
}: { 
  currentStatus: string
  onClose: () => void
  onChangeStatus: (status: string) => void
}) {
  const [newStatus, setNewStatus] = useState(currentStatus)

  const statuses = [
    { value: 'draft', label: 'Borrador', description: 'Hipoteca en preparación' },
    { value: 'review', label: 'En Revisión', description: 'Validando documentos' },
    { value: 'fundraising', label: 'Recaudando', description: 'Buscando inversionistas' },
    { value: 'funded', label: 'Fondeada', description: 'Capital completo recaudado' },
    { value: 'disbursed', label: 'Desembolsada', description: 'Dinero entregado al cliente' },
    { value: 'current', label: 'Al Día', description: 'Pagos al corriente' },
    { value: 'overdue', label: 'En Mora', description: 'Pagos atrasados' },
    { value: 'paid_off', label: 'Pagada', description: 'Hipoteca liquidada' },
    { value: 'cancelled', label: 'Cancelada', description: 'Hipoteca cancelada' },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Cambiar Estado</h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {statuses.map(status => (
                <label
                  key={status.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    newStatus === status.value 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={status.value}
                    checked={newStatus === status.value}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">{status.label}</p>
                    <p className="text-sm text-gray-500">{status.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-4 mt-4 border-t">
              <button onClick={onClose} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button 
                onClick={() => onChangeStatus(newStatus)} 
                className="btn-primary flex-1"
                disabled={newStatus === currentStatus}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
