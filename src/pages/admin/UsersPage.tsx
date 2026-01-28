import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Search, Eye, Edit, UserPlus } from 'lucide-react'
import type { User } from '../../types/database'

const userTypeLabels: Record<string, { label: string; class: string }> = {
  admin: { label: 'Administrador', class: 'badge-info' },
  investor: { label: 'Inversionista', class: 'badge-success' },
  borrower: { label: 'Deudor', class: 'badge-warning' },
  both: { label: 'Inv/Deudor', class: 'badge-gray' },
}

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', search, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,document_number.ilike.%${search}%`)
      }

      if (typeFilter) {
        query = query.eq('user_type', typeFilter)
      }

      const { data, error } = await query

      if (error) throw error
      return data as User[]
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 mt-1">
            Gestiona inversionistas, deudores y administradores
          </p>
        </div>
        <button className="btn-primary">
          <UserPlus className="w-5 h-5 mr-2" />
          Nuevo Usuario
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
                placeholder="Buscar por nombre, email o documento..."
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
              <option value="investor">Inversionistas</option>
              <option value="borrower">Deudores</option>
              <option value="admin">Administradores</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando usuarios...</p>
          </div>
        ) : users && users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Documento</th>
                  <th>Teléfono</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-medium text-sm">
                            {user.full_name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="text-gray-500">{user.email}</td>
                    <td>
                      {user.document_number ? (
                        <span>{user.document_type} {user.document_number}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td>{user.phone || <span className="text-gray-400">-</span>}</td>
                    <td>
                      <span className={userTypeLabels[user.user_type]?.class || 'badge-gray'}>
                        {userTypeLabels[user.user_type]?.label || user.user_type}
                      </span>
                    </td>
                    <td>
                      {user.is_active ? (
                        <span className="badge-success">Activo</span>
                      ) : (
                        <span className="badge-danger">Inactivo</span>
                      )}
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
            <UserPlus className="w-12 h-12 text-gray-300 mx-auto" />
            <p className="text-gray-500 mt-4">No hay usuarios registrados</p>
          </div>
        )}
      </div>
    </div>
  )
}
