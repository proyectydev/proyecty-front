import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Plus, Search, Filter, Eye, Edit, FileText } from 'lucide-react'
import { formatCurrency } from '../../utils/format'
import type { LoanSummary } from '../../types/database'

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
}

export function LoansPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data: loans, isLoading } = useQuery({
    queryKey: ['loans', search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('v_loans_summary')
        .select('*')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Préstamos</h1>
          <p className="text-gray-500 mt-1">
            Gestiona los préstamos hipotecarios del sistema
          </p>
        </div>
        <button className="btn-primary">
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Préstamo
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
            <p className="text-gray-500 mt-4">Cargando préstamos...</p>
          </div>
        ) : loans && loans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Deudor</th>
                  <th>Monto</th>
                  <th>Saldo</th>
                  <th>Tasa</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loans.map((loan) => (
                  <tr key={loan.id}>
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
                    <td>{loan.annual_interest_rate}%</td>
                    <td>
                      <span className={statusLabels[loan.status]?.class || 'badge-gray'}>
                        {statusLabels[loan.status]?.label || loan.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Ver">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                          <Edit className="w-4 h-4 text-gray-500" />
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
            <p className="text-gray-500 mt-4">No hay préstamos registrados</p>
            <button className="btn-primary mt-4">
              <Plus className="w-5 h-5 mr-2" />
              Crear primer préstamo
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
