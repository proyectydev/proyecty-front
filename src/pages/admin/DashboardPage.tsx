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
} from 'lucide-react'
import { formatCurrency } from '../../utils/format'

export function DashboardPage() {
  // Query para estadísticas de préstamos
  const { data: loanStats } = useQuery({
    queryKey: ['loan-stats'],
    queryFn: async () => {
      const { data: loans } = await supabase
        .from('loans')
        .select('status, current_balance, disbursed_amount')

      type LoanRow = { status: string; current_balance: number | null; disbursed_amount: number | null }
      const loanList = (loans || []) as LoanRow[]

      const stats = {
        total: loanList.length,
        active: loanList.filter(l => ['disbursed', 'current', 'overdue'].includes(l.status)).length,
        overdue: loanList.filter(l => l.status === 'overdue').length,
        totalBalance: loanList.reduce((acc, l) => acc + (l.current_balance || 0), 0),
        totalDisbursed: loanList.reduce((acc, l) => acc + (l.disbursed_amount || 0), 0),
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

  // Query para transacciones del mes
  const { data: monthTransactions } = useQuery({
    queryKey: ['month-transactions'],
    queryFn: async () => {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data } = await supabase
        .from('transactions')
        .select('amount, transaction_type')
        .gte('payment_date', startOfMonth.toISOString())
        .eq('status', 'completed')

      type TxRow = { amount: number; transaction_type: string }
      const txList = (data || []) as TxRow[]

      const interestReceived = txList
        .filter(t => t.transaction_type === 'interest_payment')
        .reduce((acc, t) => acc + t.amount, 0)

      return {
        count: txList.length,
        interestReceived,
      }
    },
  })

  const statCards = [
    {
      title: 'Cartera Total',
      value: formatCurrency(loanStats?.totalBalance || 0),
      icon: DollarSign,
      color: 'bg-primary-500',
      description: 'Saldo actual de préstamos',
    },
    {
      title: 'Préstamos Activos',
      value: loanStats?.active || 0,
      icon: FileText,
      color: 'bg-green-500',
      description: `${loanStats?.total || 0} préstamos totales`,
    },
    {
      title: 'Inversionistas',
      value: userStats?.investors || 0,
      icon: Users,
      color: 'bg-blue-500',
      description: `${userStats?.borrowers || 0} deudores registrados`,
    },
    {
      title: 'Intereses del Mes',
      value: formatCurrency(monthTransactions?.interestReceived || 0),
      icon: TrendingUp,
      color: 'bg-accent-500',
      description: `${monthTransactions?.count || 0} transacciones`,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Bienvenido al panel de administración de Proyecty
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.title} className="card">
            <div className="card-body">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{stat.description}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas y actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Alertas</h2>
          </div>
          <div className="card-body space-y-4">
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
            <div className="flex items-center justify-center h-32 text-gray-400">
              <div className="text-center">
                <Clock className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No hay actividad reciente</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
