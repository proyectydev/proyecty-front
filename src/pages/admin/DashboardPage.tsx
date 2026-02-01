import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  PiggyBank,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Percent,
} from 'lucide-react'
import { formatCurrency } from '../../utils/format'

type DatePreset = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom'

// Función para obtener fechas según el preset
function getDateRange(preset: DatePreset, customStart?: Date, customEnd?: Date): { start: Date | null; end: Date } {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  
  switch (preset) {
    case 'today': {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    case 'week': {
      const start = new Date(now)
      start.setDate(now.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    case 'month': {
      const start = new Date(now)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    case 'quarter': {
      const start = new Date(now)
      start.setMonth(now.getMonth() - 3)
      start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    case 'year': {
      const start = new Date(now)
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      return { start, end }
    }
    case 'custom': {
      return { 
        start: customStart || null, 
        end: customEnd || end 
      }
    }
    case 'all':
    default:
      return { start: null, end }
  }
}

export function DashboardPage() {
  // Estados para filtros de fecha
  const [datePreset, setDatePreset] = useState<DatePreset>('month')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  
  // Calcular rango de fechas
  const dateRange = useMemo(() => {
    return getDateRange(
      datePreset,
      customStartDate ? new Date(customStartDate) : undefined,
      customEndDate ? new Date(customEndDate) : undefined
    )
  }, [datePreset, customStartDate, customEndDate])

  // Query para estadísticas de préstamos (totales, no filtradas por fecha)
  const { data: loanStats } = useQuery({
    queryKey: ['loan-stats'],
    queryFn: async () => {
      const { data: loans, error } = await supabase
        .from('loans')
        .select('status, current_balance, disbursed_amount, requested_amount, proyecty_commission_rate, investor_return_rate')
        .neq('status', 'deleted')
        .neq('status', 'cancelled')

      if (error) {
        console.error('Error fetching loans:', error)
        return null
      }

      type LoanRow = { 
        status: string; 
        current_balance: number | null; 
        disbursed_amount: number | null;
        requested_amount: number | null;
        proyecty_commission_rate: number | null;
        investor_return_rate: number | null;
      }
      const loanList = (loans || []) as LoanRow[]

      const activeStatuses = ['disbursed', 'current', 'overdue']
      const activeLoans = loanList.filter(l => activeStatuses.includes(l.status))
      
      // Para préstamos activos, usar current_balance, o si es 0/null, usar requested_amount
      const getBalance = (l: LoanRow) => {
        if (activeStatuses.includes(l.status)) {
          return l.current_balance && l.current_balance > 0 ? l.current_balance : (l.requested_amount || 0)
        }
        return l.current_balance || 0
      }
      
      // Para disbursed_amount, usar el valor o requested_amount como fallback para préstamos activos
      const getDisbursed = (l: LoanRow) => {
        if (activeStatuses.includes(l.status)) {
          return l.disbursed_amount && l.disbursed_amount > 0 ? l.disbursed_amount : (l.requested_amount || 0)
        }
        return l.disbursed_amount || 0
      }
      
      const stats = {
        total: loanList.length,
        active: activeLoans.length,
        overdue: loanList.filter(l => l.status === 'overdue').length,
        pending: loanList.filter(l => ['draft', 'fundraising', 'funded'].includes(l.status)).length,
        paidOff: loanList.filter(l => l.status === 'paid_off').length,
        totalBalance: loanList.reduce((acc, l) => acc + getBalance(l), 0),
        totalDisbursed: loanList.reduce((acc, l) => acc + getDisbursed(l), 0),
        avgProyectyRate: activeLoans.length > 0 
          ? activeLoans.reduce((acc, l) => acc + (l.proyecty_commission_rate || 0), 0) / activeLoans.length 
          : 0,
        avgInvestorRate: activeLoans.length > 0 
          ? activeLoans.reduce((acc, l) => acc + (l.investor_return_rate || 0), 0) / activeLoans.length 
          : 0,
      }
      return stats
    },
  })

  // Query para usuarios
  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const { data: users } = await supabase
        .from('users')
        .select('user_type')

      type UserRow = { user_type: string }
      const userList = (users || []) as UserRow[]

      const stats = {
        total: userList.length,
        investors: userList.filter(u => u.user_type === 'investor' || u.user_type === 'both').length,
        borrowers: userList.filter(u => u.user_type === 'borrower' || u.user_type === 'both').length,
      }
      return stats
    },
  })

  // Query para transacciones del período seleccionado
  const { data: periodTransactions, isLoading: loadingTransactions } = useQuery({
    queryKey: ['period-transactions', dateRange.start?.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      // Query con filtros correctos
      let query = supabase
        .from('transactions')
        .select('amount, transaction_type, payment_date, description, status')
        .order('payment_date', { ascending: false })

      if (dateRange.start) {
        query = query.gte('payment_date', dateRange.start.toISOString())
      }
      query = query.lte('payment_date', dateRange.end.toISOString())

      const { data, error } = await query
      
      if (error) {
        console.error('Error en query transacciones:', error)
        return null
      }

      type TxRow = { amount: number; transaction_type: string; payment_date: string; description: string | null; status: string }
      const txList = (data || []) as TxRow[]

      // Calcular métricas (todas las transacciones, sin filtrar por status)
      const interestPayments = txList.filter(t => t.transaction_type === 'interest_payment')
      const principalPayments = txList.filter(t => t.transaction_type === 'principal_payment')
      const disbursements = txList.filter(t => t.transaction_type === 'loan_disbursement')
      const proyectyCommissions = txList.filter(t => t.transaction_type === 'proyecty_commission')
      const investorReturns = txList.filter(t => t.transaction_type === 'investor_return')

      const totalInterest = interestPayments.reduce((acc, t) => acc + t.amount, 0)
      const totalPrincipal = principalPayments.reduce((acc, t) => acc + t.amount, 0)
      const totalDisbursed = disbursements.reduce((acc, t) => acc + t.amount, 0)
      const totalProyectyCommissions = proyectyCommissions.reduce((acc, t) => acc + t.amount, 0)
      const totalInvestorReturns = investorReturns.reduce((acc, t) => acc + t.amount, 0)

      // Calcular porcentajes de distribución
      const totalEarnings = totalInterest
      const proyectyPercentage = totalEarnings > 0 ? (totalProyectyCommissions / totalEarnings) * 100 : 0
      const investorPercentage = totalEarnings > 0 ? (totalInvestorReturns / totalEarnings) * 100 : 0

      return {
        transactions: txList.slice(0, 10), // Últimas 10 para mostrar
        count: txList.length,
        totalInterest,
        totalPrincipal,
        totalDisbursed,
        totalProyectyCommissions,
        totalInvestorReturns,
        proyectyPercentage,
        investorPercentage,
        totalCollected: totalInterest + totalPrincipal,
      }
    },
  })

  // Etiquetas para tipos de transacción
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

  // Presets de fecha
  const datePresets = [
    { value: 'today', label: 'Hoy' },
    { value: 'week', label: 'Última semana' },
    { value: 'month', label: 'Este mes' },
    { value: 'quarter', label: 'Último trimestre' },
    { value: 'year', label: 'Este año' },
    { value: 'all', label: 'Todo' },
    { value: 'custom', label: 'Personalizado' },
  ]

  const statCards = [
    {
      title: 'Cartera Total',
      value: formatCurrency(loanStats?.totalBalance || 0),
      icon: DollarSign,
      color: 'bg-gradient-to-br from-primary-400 to-primary-600',
      iconBg: 'bg-primary-500/20',
      description: `${formatCurrency(loanStats?.totalDisbursed || 0)} desembolsado`,
    },
    {
      title: 'Préstamos Activos',
      value: loanStats?.active || 0,
      icon: FileText,
      color: 'bg-gradient-to-br from-dark-700 to-dark-900',
      iconBg: 'bg-dark-800',
      description: `${loanStats?.pending || 0} pendientes · ${loanStats?.paidOff || 0} pagados`,
    },
    {
      title: 'Inversionistas',
      value: userStats?.investors || 0,
      icon: Users,
      color: 'bg-gradient-to-br from-gray-500 to-gray-700',
      iconBg: 'bg-gray-600',
      description: `${userStats?.borrowers || 0} deudores registrados`,
    },
    {
      title: 'Recaudado (Período)',
      value: formatCurrency(periodTransactions?.totalCollected || 0),
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
      iconBg: 'bg-emerald-600',
      description: `${periodTransactions?.count || 0} transacciones`,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header con filtros de fecha - Diseño mejorado */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Panel de administración de Proyecty
          </p>
        </div>
        
        {/* Filtros de fecha - Inline mejorado */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-500" />
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="text-sm font-medium bg-transparent border-none focus:ring-0 text-gray-700 cursor-pointer pr-8"
            >
              {datePresets.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 pl-0 sm:pl-3 sm:border-l border-gray-200">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
              <span className="text-gray-400 text-sm">a</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid - Premium Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.title} className="card hover:shadow-lg transition-all duration-300 border-gray-100 hover:border-primary-200">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-dark-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl shadow-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Métricas del Período - Estilo Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-emerald-50 to-white border-emerald-100 hover:shadow-md transition-all">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/30">
                <ArrowDownCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Intereses Recibidos</p>
                <p className="text-xl font-bold text-dark-900">
                  {formatCurrency(periodTransactions?.totalInterest || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-gray-50 to-white border-gray-200 hover:shadow-md transition-all">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-dark-800 rounded-xl shadow-lg shadow-dark-800/30">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Abonos a Capital</p>
                <p className="text-xl font-bold text-dark-900">
                  {formatCurrency(periodTransactions?.totalPrincipal || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-slate-50 to-white border-slate-200 hover:shadow-md transition-all">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-700 rounded-xl shadow-lg shadow-slate-700/30">
                <ArrowUpCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-semibold uppercase tracking-wide">Desembolsos</p>
                <p className="text-xl font-bold text-dark-900">
                  {formatCurrency(periodTransactions?.totalDisbursed || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-primary-50 to-white border-primary-200 hover:shadow-md transition-all">
          <div className="card-body">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl shadow-lg shadow-primary-500/30">
                <PiggyBank className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-primary-700 font-semibold uppercase tracking-wide">Comisión Proyecty</p>
                <p className="text-xl font-bold text-dark-900">
                  {formatCurrency(periodTransactions?.totalProyectyCommissions || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Distribución de Ganancias */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Percent className="w-5 h-5" />
            Distribución de Intereses del Período
          </h2>
        </div>
        <div className="card-body">
          {(periodTransactions?.totalInterest || 0) > 0 ? (
            <div className="space-y-4">
              {/* Barra de distribución visual */}
              <div className="h-8 rounded-full overflow-hidden flex bg-gray-200">
                <div 
                  className="bg-primary-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                  style={{ width: `${periodTransactions?.proyectyPercentage || 0}%` }}
                >
                  {(periodTransactions?.proyectyPercentage || 0) > 10 && 
                    `${(periodTransactions?.proyectyPercentage || 0).toFixed(1)}%`
                  }
                </div>
                <div 
                  className="bg-green-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                  style={{ width: `${periodTransactions?.investorPercentage || 0}%` }}
                >
                  {(periodTransactions?.investorPercentage || 0) > 10 && 
                    `${(periodTransactions?.investorPercentage || 0).toFixed(1)}%`
                  }
                </div>
              </div>
              
              {/* Detalle */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total Intereses Recaudados</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(periodTransactions?.totalInterest || 0)}
                  </p>
                </div>
                
                <div className="p-4 bg-primary-50 rounded-lg border-l-4 border-primary-500">
                  <p className="text-sm text-primary-600">Ganancia Proyecty</p>
                  <p className="text-xl font-bold text-primary-700">
                    {formatCurrency(periodTransactions?.totalProyectyCommissions || 0)}
                  </p>
                  <p className="text-xs text-primary-500 mt-1">
                    {(periodTransactions?.proyectyPercentage || 0).toFixed(1)}% del total
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <p className="text-sm text-green-600">Rendimiento Inversionistas</p>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(periodTransactions?.totalInvestorReturns || 0)}
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    {(periodTransactions?.investorPercentage || 0).toFixed(1)}% del total
                  </p>
                </div>
              </div>

              {/* Tasas promedio */}
              <div className="pt-4 border-t flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Tasa promedio Proyecty:</span>{' '}
                  <span className="font-semibold text-primary-600">
                    {(loanStats?.avgProyectyRate || 0).toFixed(2)}% mensual
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Tasa promedio Inversionista:</span>{' '}
                  <span className="font-semibold text-green-600">
                    {(loanStats?.avgInvestorRate || 0).toFixed(2)}% mensual
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay intereses registrados en este período</p>
              <p className="text-sm mt-1">Selecciona otro rango de fechas</p>
            </div>
          )}
        </div>
      </div>

      {/* Alertas y actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas y Estado de Préstamos */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Estado de Cartera</h2>
          </div>
          <div className="card-body space-y-4">
            {/* Barra de distribución de estados */}
            {loanStats && loanStats.total > 0 && (
              <div className="space-y-2">
                <div className="h-4 rounded-full overflow-hidden flex bg-gray-200">
                  <div 
                    className="bg-green-500 transition-all" 
                    style={{ width: `${(loanStats.active / loanStats.total) * 100}%` }}
                    title={`Activos: ${loanStats.active}`}
                  />
                  <div 
                    className="bg-yellow-500 transition-all" 
                    style={{ width: `${((loanStats.pending || 0) / loanStats.total) * 100}%` }}
                    title={`Pendientes: ${loanStats.pending}`}
                  />
                  <div 
                    className="bg-red-500 transition-all" 
                    style={{ width: `${(loanStats.overdue / loanStats.total) * 100}%` }}
                    title={`En mora: ${loanStats.overdue}`}
                  />
                  <div 
                    className="bg-blue-500 transition-all" 
                    style={{ width: `${((loanStats.paidOff || 0) / loanStats.total) * 100}%` }}
                    title={`Pagados: ${loanStats.paidOff}`}
                  />
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-green-500"></span>
                    Activos ({loanStats.active})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-yellow-500"></span>
                    Pendientes ({loanStats.pending || 0})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-red-500"></span>
                    En mora ({loanStats.overdue})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-blue-500"></span>
                    Pagados ({loanStats.paidOff || 0})
                  </span>
                </div>
              </div>
            )}

            {/* Alertas */}
            {loanStats?.overdue ? (
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">
                    {loanStats.overdue} préstamo(s) en mora
                  </p>
                  <p className="text-sm text-red-600">
                    Requieren atención inmediata
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">
                    Todos los préstamos al día
                  </p>
                  <p className="text-sm text-green-600">
                    No hay alertas pendientes
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Actividad Reciente</h2>
          </div>
          <div className="card-body">
            {loadingTransactions ? (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
              </div>
            ) : periodTransactions?.transactions && periodTransactions.transactions.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {periodTransactions.transactions.map((tx, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        tx.transaction_type === 'loan_disbursement' ? 'bg-purple-100' :
                        tx.transaction_type === 'interest_payment' ? 'bg-green-100' :
                        tx.transaction_type === 'principal_payment' ? 'bg-blue-100' :
                        tx.transaction_type === 'proyecty_commission' ? 'bg-amber-100' :
                        'bg-gray-100'
                      }`}>
                        {tx.transaction_type === 'loan_disbursement' ? (
                          <ArrowUpCircle className="w-4 h-4 text-purple-600" />
                        ) : tx.transaction_type === 'interest_payment' ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : tx.transaction_type === 'principal_payment' ? (
                          <Wallet className="w-4 h-4 text-blue-600" />
                        ) : (
                          <DollarSign className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transactionTypeLabels[tx.transaction_type] || tx.transaction_type}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(tx.payment_date).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                    </div>
                    <p className={`font-semibold ${
                      tx.transaction_type === 'loan_disbursement' ? 'text-purple-600' : 'text-green-600'
                    }`}>
                      {tx.transaction_type === 'loan_disbursement' ? '-' : '+'}
                      {formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <div className="text-center">
                  <Clock className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No hay actividad en este período</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
