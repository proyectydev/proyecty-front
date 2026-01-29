import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

interface NewUserModalProps {
  isOpen: boolean
  onClose: () => void
  defaultType?: 'investor' | 'borrower' | 'both' | 'admin'
}

export function NewUserModal({ isOpen, onClose, defaultType = 'borrower' }: NewUserModalProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    document_type: 'CC',
    document_number: '',
    user_type: defaultType as 'investor' | 'borrower' | 'both' | 'admin',
    address: '',
    city: 'Cúcuta',
    department: 'Norte de Santander',
    bank_name: '',
    bank_account_type: '',
    bank_account_number: '',
    admin_notes: '',
    is_online_user: false, // Usuario creado por admin = offline
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validaciones básicas
      if (!formData.full_name.trim()) {
        throw new Error('El nombre es requerido')
      }
      if (!formData.email.trim()) {
        throw new Error('El email es requerido')
      }

      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          ...formData,
          is_verified: false,
          is_active: true,
        }])

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Ya existe un usuario con ese email')
        }
        throw insertError
      }

      // Refrescar lista de usuarios
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users-export'] })
      
      // Cerrar modal y limpiar
      onClose()
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        document_type: 'CC',
        document_number: '',
        user_type: defaultType,
        address: '',
        city: 'Cúcuta',
        department: 'Norte de Santander',
        bank_name: '',
        bank_account_type: '',
        bank_account_number: '',
        admin_notes: '',
        is_online_user: false,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Nuevo Usuario</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Tipo de Usuario */}
            <div>
              <label className="label">Tipo de Usuario *</label>
              <select
                name="user_type"
                value={formData.user_type}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="borrower">Deudor (Cliente)</option>
                <option value="investor">Inversionista</option>
                <option value="both">Ambos (Cliente e Inversionista)</option>
                <option value="admin">Administrador</option>
              </select>
              {formData.user_type === 'admin' && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Los administradores tienen acceso completo al sistema
                </p>
              )}
            </div>

            {/* Información Personal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Nombre Completo *</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Juan Pérez García"
                  required
                />
              </div>

              <div>
                <label className="label">Tipo de Documento</label>
                <select
                  name="document_type"
                  value={formData.document_type}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="NIT">NIT</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>

              <div>
                <label className="label">Número de Documento</label>
                <input
                  type="text"
                  name="document_number"
                  value={formData.document_number}
                  onChange={handleChange}
                  className="input"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>

              <div>
                <label className="label">Teléfono</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input"
                  placeholder="+57 300 123 4567"
                />
              </div>
            </div>

            {/* Dirección */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Dirección</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="input"
                  placeholder="Calle 10 # 5-20, Barrio Centro"
                />
              </div>

              <div>
                <label className="label">Ciudad</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Departamento</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>

            {/* Información Bancaria */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Información Bancaria (para pagos)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Banco</label>
                  <select
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Bancolombia">Bancolombia</option>
                    <option value="Davivienda">Davivienda</option>
                    <option value="BBVA">BBVA</option>
                    <option value="Banco de Bogotá">Banco de Bogotá</option>
                    <option value="Banco de Occidente">Banco de Occidente</option>
                    <option value="Banco Popular">Banco Popular</option>
                    <option value="Banco Caja Social">Banco Caja Social</option>
                    <option value="Nequi">Nequi</option>
                    <option value="Daviplata">Daviplata</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="label">Tipo de Cuenta</label>
                  <select
                    name="bank_account_type"
                    value={formData.bank_account_type}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Ahorros">Ahorros</option>
                    <option value="Corriente">Corriente</option>
                  </select>
                </div>

                <div>
                  <label className="label">Número de Cuenta</label>
                  <input
                    type="text"
                    name="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={handleChange}
                    className="input"
                    placeholder="1234567890"
                  />
                </div>
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="label">Notas del Admin</label>
              <textarea
                name="admin_notes"
                value={formData.admin_notes}
                onChange={handleChange}
                className="input min-h-[80px]"
                placeholder="Observaciones internas sobre este usuario..."
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
                {loading ? 'Guardando...' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
