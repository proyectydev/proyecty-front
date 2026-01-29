import { useState } from 'react'
import { X, UserPlus, CheckCircle, Info, MessageCircle, Copy, Check, Mail } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

interface InviteUserModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [createdUserName, setCreatedUserName] = useState('')
  const [createdUserPhone, setCreatedUserPhone] = useState('')
  const [createdUserEmail, setCreatedUserEmail] = useState('')
  const [copied, setCopied] = useState(false)
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    document_type: 'CC',
    document_number: '',
    user_type: 'borrower' as 'investor' | 'borrower' | 'both' | 'admin',
    city: 'Cúcuta',
    department: 'Norte de Santander',
    admin_notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      // Validaciones básicas
      if (!formData.full_name.trim()) {
        throw new Error('El nombre es requerido')
      }
      if (!formData.email.trim()) {
        throw new Error('El email es requerido')
      }

      // Verificar si ya existe un usuario con ese email
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email)
        .single()

      if (existingUser) {
        throw new Error('Ya existe un usuario con ese email')
      }

      // Crear solo el registro en nuestra tabla users
      // El usuario podrá registrarse después con este email para establecer contraseña
      const { error: insertError } = await supabase
        .from('users')
        .insert([{
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone || null,
          document_type: formData.document_type,
          document_number: formData.document_number || null,
          user_type: formData.user_type,
          city: formData.city,
          department: formData.department,
          admin_notes: formData.admin_notes || null,
          is_verified: false,
          is_active: true,
          is_online_user: false, // Aún no tiene cuenta de acceso
        }])

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('Ya existe un usuario con ese email')
        }
        throw insertError
      }

      // Refrescar lista de usuarios
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['borrowers'] })
      queryClient.invalidateQueries({ queryKey: ['investors'] })
      
      setCreatedUserName(formData.full_name)
      setCreatedUserPhone(formData.phone)
      setCreatedUserEmail(formData.email)
      setSuccess(true)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al invitar usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setSuccess(false)
    setError('')
    setCopied(false)
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      document_type: 'CC',
      document_number: '',
      user_type: 'borrower',
      city: 'Cúcuta',
      department: 'Norte de Santander',
      admin_notes: '',
    })
    onClose()
  }

  // Generar el mensaje de invitación
  const getInviteMessage = () => {
    const baseUrl = window.location.origin
    return `¡Hola ${createdUserName}! 👋

Te invitamos a registrarte en Proyecty, nuestra plataforma de gestión hipotecaria.

📧 Tu email registrado: ${createdUserEmail}

🔗 Para crear tu contraseña y acceder, visita:
${baseUrl}/registro

Si tienes alguna pregunta, no dudes en contactarnos.

¡Gracias por confiar en nosotros! 🏠`
  }

  // Abrir WhatsApp con el mensaje
  const handleWhatsApp = () => {
    const message = encodeURIComponent(getInviteMessage())
    const phone = createdUserPhone.replace(/\D/g, '') // Eliminar todo excepto números
    const whatsappUrl = phone 
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}` // Si no hay teléfono, abre WhatsApp sin destinatario
    window.open(whatsappUrl, '_blank')
  }

  // Copiar mensaje al portapapeles
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(getInviteMessage())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Error al copiar:', err)
    }
  }

  // Abrir cliente de email
  const handleEmail = () => {
    const subject = encodeURIComponent('Invitación a Proyecty - Plataforma de Gestión Hipotecaria')
    const body = encodeURIComponent(getInviteMessage())
    window.open(`mailto:${createdUserEmail}?subject=${subject}&body=${body}`)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg">
          {/* Header */}
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <UserPlus className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Crear Usuario</h2>
                <p className="text-sm text-gray-500">Se creará en el sistema para asignarlo</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Contenido */}
          <div className="p-6">
            {success ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  ¡Usuario Creado!
                </h3>
                <p className="text-gray-600 mb-4">
                  <strong>{createdUserName}</strong> ha sido registrado en el sistema.
                </p>
                
                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left mb-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">Siguiente paso</p>
                      <p className="text-blue-700">
                        Envíale el enlace de registro para que cree su contraseña. 
                        Ya puedes asignarlo a hipotecas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="space-y-3 mb-4">
                  {/* WhatsApp */}
                  <button 
                    onClick={handleWhatsApp}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Enviar por WhatsApp
                  </button>

                  {/* Email */}
                  <button 
                    onClick={handleEmail}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    Enviar por Email
                  </button>

                  {/* Copiar */}
                  <button 
                    onClick={handleCopyMessage}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="text-green-600">¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-5 h-5" />
                        Copiar mensaje de invitación
                      </>
                    )}
                  </button>
                </div>

                <button 
                  onClick={handleClose}
                  className="btn-secondary w-full"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    <option value="borrower">Cliente (Deudor)</option>
                    <option value="investor">Inversionista</option>
                    <option value="both">Cliente e Inversionista</option>
                    <option value="admin">Administrador</option>
                  </select>
                  {formData.user_type === 'admin' && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ Los administradores tienen acceso completo al sistema
                    </p>
                  )}
                </div>

                {/* Nombre y Email */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
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
                    <p className="text-xs text-gray-500 mt-1">
                      El usuario usará este email para registrarse
                    </p>
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

                {/* Documento */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Tipo Doc.</label>
                    <select
                      name="document_type"
                      value={formData.document_type}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="CC">CC</option>
                      <option value="CE">CE</option>
                      <option value="NIT">NIT</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Número</label>
                    <input
                      type="text"
                      name="document_number"
                      value={formData.document_number}
                      onChange={handleChange}
                      className="input"
                      placeholder="1234567890"
                    />
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <label className="label">Notas (opcional)</label>
                  <textarea
                    name="admin_notes"
                    value={formData.admin_notes}
                    onChange={handleChange}
                    className="input min-h-[60px]"
                    placeholder="Observaciones internas..."
                  />
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={handleClose}
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
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" />
                        Crear Usuario
                      </span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
