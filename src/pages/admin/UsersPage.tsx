import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Search, Eye, Edit, UserPlus, Trash2, MoreVertical, RefreshCw, Mail, Send } from 'lucide-react'
import { InviteUserModal, EditUserModal, DeleteConfirmModal, ResendInviteModal } from '../../components/modals'
import type { User } from '../../types/database'

const userTypeLabels: Record<string, { label: string; class: string }> = {
  admin: { label: 'Administrador', class: 'badge-info' },
  investor: { label: 'Inversionista', class: 'badge-success' },
  borrower: { label: 'Deudor', class: 'badge-warning' },
  user: { label: 'Usuario', class: 'badge-gray' },
  both: { label: 'Inv/Deudor', class: 'badge-purple' },
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showResendInviteModal, setShowResendInviteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [changingType, setChangingType] = useState<string | null>(null)

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

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setShowEditUserModal(true)
    setOpenMenuId(null)
  }

  const handleDeleteClick = (user: User) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
    setOpenMenuId(null)
  }

  const handleResendInvite = (user: User) => {
    setSelectedUser(user)
    setShowResendInviteModal(true)
    setOpenMenuId(null)
  }

  const handleDeleteUser = async () => {
    if (!selectedUser) return
    
    // Verificar si el usuario tiene inversiones
    const { data: investments } = await supabase
      .from('investments')
      .select('id')
      .eq('investor_id', selectedUser.id)
      .limit(1)
    
    if (investments && investments.length > 0) {
      throw new Error('No se puede eliminar este usuario porque tiene inversiones registradas. Puedes desactivarlo en su lugar.')
    }
    
    // Verificar si el usuario tiene propiedades/hipotecas
    const { data: properties } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', selectedUser.id)
      .limit(1)
    
    if (properties && properties.length > 0) {
      throw new Error('No se puede eliminar este usuario porque tiene hipotecas registradas. Puedes desactivarlo en su lugar.')
    }
    
    // Solo si no tiene datos asociados, eliminar
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', selectedUser.id)
    
    if (error) throw error
    
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  // Cambiar tipo de usuario (para permitir que un cliente también sea inversionista)
  const handleChangeUserType = async (userId: string, newType: string) => {
    setChangingType(userId)
    try {
      const { error } = await supabase
        .from('users')
        .update({ user_type: newType })
        .eq('id', userId)
      
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ['users'] })
      }
    } finally {
      setChangingType(null)
      setOpenMenuId(null)
    }
  }

  const toggleMenu = (userId: string) => {
    setOpenMenuId(openMenuId === userId ? null : userId)
  }

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
        <button onClick={() => setShowInviteModal(true)} className="btn-primary">
          <Mail className="w-5 h-5 mr-2" />
          Invitar Usuario
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

      {/* Table - Desktop */}
      <div className="card overflow-hidden hidden md:block">
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
                      {user.is_online_user ? (
                        <span className="badge-success">Con cuenta</span>
                      ) : (
                        <span className="badge-warning">Sin cuenta</span>
                      )}
                    </td>
                    <td>
                      <div className="relative">
                        <button 
                          onClick={() => toggleMenu(user.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        
                        {openMenuId === user.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border z-20">
                              <button
                                onClick={() => handleEditUser(user)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 first:rounded-t-lg"
                              >
                                <Edit className="w-4 h-4" />
                                Editar
                              </button>
                              <button
                                onClick={() => handleEditUser(user)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                Ver detalles
                              </button>
                              {/* Reenviar invitación si no tiene cuenta */}
                              {!user.is_online_user && (
                                <button
                                  onClick={() => handleResendInvite(user)}
                                  className="w-full px-4 py-2 text-left text-sm text-primary-600 hover:bg-primary-50 flex items-center gap-2"
                                >
                                  <Send className="w-4 h-4" />
                                  Reenviar invitación
                                </button>
                              )}
                              {/* Opciones para cambiar tipo de usuario */}
                              {user.user_type !== 'admin' && (
                                <>
                                  <hr />
                                  <div className="px-4 py-2 text-xs text-gray-500 font-medium">
                                    Cambiar a:
                                  </div>
                                  {user.user_type !== 'both' && (
                                    <button
                                      onClick={() => handleChangeUserType(user.id, 'both')}
                                      disabled={changingType === user.id}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <RefreshCw className={`w-4 h-4 ${changingType === user.id ? 'animate-spin' : ''}`} />
                                      Cliente + Inversionista
                                    </button>
                                  )}
                                  {user.user_type === 'borrower' && (
                                    <button
                                      onClick={() => handleChangeUserType(user.id, 'investor')}
                                      disabled={changingType === user.id}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <RefreshCw className={`w-4 h-4 ${changingType === user.id ? 'animate-spin' : ''}`} />
                                      Solo Inversionista
                                    </button>
                                  )}
                                  {user.user_type === 'investor' && (
                                    <button
                                      onClick={() => handleChangeUserType(user.id, 'borrower')}
                                      disabled={changingType === user.id}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <RefreshCw className={`w-4 h-4 ${changingType === user.id ? 'animate-spin' : ''}`} />
                                      Solo Cliente
                                    </button>
                                  )}
                                </>
                              )}
                              <hr />
                              <button
                                onClick={() => handleDeleteClick(user)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 last:rounded-b-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                              </button>
                            </div>
                          </>
                        )}
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
            <button onClick={() => setShowInviteModal(true)} className="btn-primary mt-4">
              <Mail className="w-5 h-5 mr-2" />
              Invitar primer usuario
            </button>
          </div>
        )}
      </div>

      {/* Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-500 mt-4">Cargando usuarios...</p>
          </div>
        ) : users && users.length > 0 ? (
          users.map((user) => (
            <div key={user.id} className="card">
              <div className="card-body p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-600 font-medium">
                        {user.full_name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{user.full_name}</p>
                      <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`${userTypeLabels[user.user_type]?.class || 'badge-gray'} text-xs`}>
                      {userTypeLabels[user.user_type]?.label || user.user_type}
                    </span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {user.phone || 'Sin teléfono'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(user)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card">
            <div className="card-body p-8 text-center">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-4">No hay usuarios registrados</p>
              <button onClick={() => setShowInviteModal(true)} className="btn-primary mt-4">
                <Mail className="w-5 h-5 mr-2" />
                Invitar primer usuario
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <InviteUserModal 
        isOpen={showInviteModal} 
        onClose={() => setShowInviteModal(false)} 
      />

      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => {
          setShowEditUserModal(false)
          setSelectedUser(null)
        }}
        user={selectedUser}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedUser(null)
        }}
        onConfirm={handleDeleteUser}
        title="Eliminar Usuario"
        message="¿Estás seguro de que deseas eliminar este usuario? Se eliminarán todos sus datos."
        itemName={selectedUser?.full_name}
      />

      <ResendInviteModal
        isOpen={showResendInviteModal}
        onClose={() => {
          setShowResendInviteModal(false)
          setSelectedUser(null)
        }}
        user={selectedUser}
      />
    </div>
  )
}
