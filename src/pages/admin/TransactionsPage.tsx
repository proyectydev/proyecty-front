import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Plus, Search, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatCurrency, formatDate } from '../../utils/format'
import { NewTransactionModal } from '../../components/modals'
import type { Transaction } from '../../types/database'

const transactionTypeLabels: Record<string, { label: string; icon: 'in' | 'out'; color: string }> = {
  investor_deposit: { label: 'Entrada de Inversión', icon: 'in', color: 'text-green-600' },
  loan_disbursement: { label: 'Desembolso', icon: 'out', color: 'text-red-600' },
  interest_payment: { label: 'Recaudo Intereses', icon: 'in', color: 'text-green-600' },
  principal_payment: { label: 'Recaudo Capital', icon: 'in', color: 'text-green-600' },
  investor_return: { label: 'Rendimiento', icon: 'out', color: 'text-blue-600' },
  proyecty_commission: { label: 'Comisión Proyecty', icon: 'in', color: 'text-primary-600' },
  adjustment: { label: 'Ajuste', icon: 'in', color: 'text-gray-600' },
  refund: { label: 'Reembolso', icon: 'out', color: 'text-red-600' },
}

export function TransactionsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [showTransactionModal, setShowTransactionModal] = useState(false)

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', search, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100)

      if (search) {
        query = query.ilike('transaction_code', `%${search}%`)
      }

      if (typeFilter) {
        query = query.eq('transaction_type', typeFilter)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Transaction[]
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transacciones</h1>
          <p className="text-gray-500 mt-1">
            Historial de todos los movimientos financieros
          </p>
        </div>
        <button onClick={() => setShowTransactionModal(true)} className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Registrar Pago
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
                placeholder="Buscar por código de transacción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input w-auto"
            >
              <option value="">Todos los tipos</option>
              <option value="interest_payment">Pagos de Intereses</option>
              <option value="principal_payment">Abonos a Capital</option>
              <option value="investor_deposit">Depósitos</option>
              <option value="loan_disbursement">Desembolsos</option>
              <option value="proyecty_commission">Comisiones</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table - Desktop */}
      <div className="card overflow-hidden hidden md:block">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando transacciones...</p>
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((tx) => {
                  const typeInfo = transactionTypeLabels[tx.transaction_type] || {
                    label: tx.transaction_type,
                    icon: 'in',
                    color: 'text-gray-600',
                  }
                  return (
                    <tr key={tx.id}>
                      <td>
                        <span className="font-mono text-sm text-gray-600">
                          {tx.transaction_code}
                        </span>
                      </td>
                      <td>{formatDate(tx.payment_date)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          {typeInfo.icon === 'in' ? (
                            <ArrowDownRight className={`w-4 h-4 ${typeInfo.color}`} />
                          ) : (
                            <ArrowUpRight className={`w-4 h-4 ${typeInfo.color}`} />
                          )}
                          <span className={typeInfo.color}>{typeInfo.label}</span>
                        </div>
                      </td>
                      <td className="font-medium">{formatCurrency(tx.amount)}</td>
                      <td>{tx.payment_method || '-'}</td>
                      <td>
                        {tx.status === 'completed' ? (
                          <span className="badge-success">Completado</span>
                        ) : tx.status === 'pending' ? (
                          <span className="badge-warning">Pendiente</span>
                        ) : (
                          <span className="badge-danger">{tx.status}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <DollarSign className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-gray-500 mt-4">No hay transacciones registradas</p>
            <button onClick={() => setShowTransactionModal(true)} className="btn-primary mt-4">
              <Plus className="w-5 h-5 mr-2" />
              Registrar primer pago
            </button>
          </div>
        )}
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando transacciones...</p>
          </div>
        ) : transactions && transactions.length > 0 ? (
          transactions.map((tx) => {
            const typeInfo = transactionTypeLabels[tx.transaction_type] || {
              label: tx.transaction_type,
              icon: 'in',
              color: 'text-gray-600',
            }
            return (
              <div key={tx.id} className="card">
                <div className="card-body p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${typeInfo.icon === 'in' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {typeInfo.icon === 'in' ? (
                          <ArrowDownRight className={`w-5 h-5 ${typeInfo.color}`} />
                        ) : (
                          <ArrowUpRight className={`w-5 h-5 ${typeInfo.color}`} />
                        )}
                      </div>
                      <div>
                        <p className={`font-medium ${typeInfo.color}`}>{typeInfo.label}</p>
                        <p className="text-xs text-gray-500">{formatDate(tx.payment_date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(tx.amount)}</p>
                      {tx.status === 'completed' ? (
                        <span className="badge-success text-xs">Completado</span>
                      ) : tx.status === 'pending' ? (
                        <span className="badge-warning text-xs">Pendiente</span>
                      ) : (
                        <span className="badge-danger text-xs">{tx.status}</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-gray-500">
                    <span className="font-mono">{tx.transaction_code}</span>
                    <span>{tx.payment_method || 'Sin método'}</span>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="card">
            <div className="card-body p-8 text-center">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-4">No hay transacciones registradas</p>
              <button onClick={() => setShowTransactionModal(true)} className="btn-primary mt-4">
                <Plus className="w-5 h-5 mr-2" />
                Registrar primer pago
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <NewTransactionModal 
        isOpen={showTransactionModal} 
        onClose={() => setShowTransactionModal(false)} 
      />
    </div>
  )
}
