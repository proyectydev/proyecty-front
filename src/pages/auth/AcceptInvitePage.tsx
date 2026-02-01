import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2, Lock, User, Mail, Phone, MapPin } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface UserData {
  id: string
  full_name: string
  email: string
  phone: string | null
  document_type: string
  document_number: string | null
  city: string
  department: string
  user_type: string
}

export function AcceptInvitePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [userData, setUserData] = useState<UserData | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    document_type: 'CC',
    document_number: '',
    city: 'Cúcuta',
    department: 'Norte de Santander',
    password: '',
    confirmPassword: '',
  })

  // Procesar el token de invitación al cargar
  useEffect(() => {
    processInvitation()
  }, [])

  async function processInvitation() {
    setLoading(true)
    setError('')

    try {
      // Supabase pone los tokens en el hash de la URL
      // Formato: #access_token=xxx&refresh_token=xxx&type=invite
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const type = hashParams.get('type')

      console.log('Hash params:', { hasAccessToken: !!accessToken, type })

      // Si hay tokens en el hash, establecer la sesión
      if (accessToken && refreshToken) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError) {
          console.error('Error setting session:', sessionError)
          throw new Error('El enlace de invitación ha expirado o es inválido. Solicita una nueva invitación.')
        }

        if (sessionData.user) {
          // Limpiar el hash de la URL
          window.history.replaceState(null, '', window.location.pathname)
          
          // Obtener datos del usuario de nuestra tabla
          const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', sessionData.user.email)
            .single()

          if (userError && userError.code !== 'PGRST116') {
            console.error('Error fetching user:', userError)
          }

          if (existingUser) {
            setUserData(existingUser)
            setFormData(prev => ({
              ...prev,
              full_name: existingUser.full_name || '',
              phone: existingUser.phone || '',
              document_type: existingUser.document_type || 'CC',
              document_number: existingUser.document_number || '',
              city: existingUser.city || 'Cúcuta',
              department: existingUser.department || 'Norte de Santander',
            }))
          } else {
            // El usuario no existe en nuestra tabla, usar datos del auth
            setUserData({
              id: sessionData.user.id,
              full_name: sessionData.user.user_metadata?.full_name || '',
              email: sessionData.user.email || '',
              phone: null,
              document_type: 'CC',
              document_number: null,
              city: 'Cúcuta',
              department: 'Norte de Santander',
              user_type: sessionData.user.user_metadata?.user_type || 'user',
            })
            setFormData(prev => ({
              ...prev,
              full_name: sessionData.user.user_metadata?.full_name || '',
            }))
          }
        }
      } else {
        // No hay tokens, verificar si ya hay sesión activa
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Ya hay sesión, obtener datos del usuario
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .single()

          if (existingUser) {
            setUserData(existingUser)
            setFormData(prev => ({
              ...prev,
              full_name: existingUser.full_name || '',
              phone: existingUser.phone || '',
              document_type: existingUser.document_type || 'CC',
              document_number: existingUser.document_number || '',
              city: existingUser.city || 'Cúcuta',
              department: existingUser.department || 'Norte de Santander',
            }))
          }
        } else {
          throw new Error('No se encontró información de invitación. Usa el enlace que recibiste por correo.')
        }
      }
    } catch (err) {
      console.error('Error processing invitation:', err)
      setError(err instanceof Error ? err.message : 'Error al procesar la invitación')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Validar contraseña fuerte
  const isStrongPassword = (password: string) => {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /[0-9]/.test(password)
  }

  const getPasswordStrength = () => {
    const { password } = formData
    if (!password) return null
    
    let strength = 0
    if (password.length >= 8) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++

    if (strength <= 2) return { text: 'Débil', color: 'bg-red-500', width: '33%' }
    if (strength <= 3) return { text: 'Media', color: 'bg-yellow-500', width: '66%' }
    return { text: 'Fuerte', color: 'bg-green-500', width: '100%' }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      // Validaciones
      if (!formData.full_name.trim() || formData.full_name.trim().length < 3) {
        throw new Error('El nombre debe tener al menos 3 caracteres')
      }

      if (!isStrongPassword(formData.password)) {
        throw new Error('La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula y número')
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden')
      }

      // 1. Actualizar la contraseña del usuario
      const { error: updateAuthError } = await supabase.auth.updateUser({
        password: formData.password,
        data: {
          full_name: formData.full_name,
        }
      })

      if (updateAuthError) {
        throw updateAuthError
      }

      // 2. Actualizar datos en nuestra tabla users
      if (userData) {
        const { error: updateUserError } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            phone: formData.phone || null,
            document_type: formData.document_type,
            document_number: formData.document_number || null,
            city: formData.city,
            department: formData.department,
            is_verified: true,
            is_online_user: true,
          })
          .eq('email', userData.email)

        if (updateUserError) {
          console.error('Error updating user data:', updateUserError)
          // No fallamos, la cuenta ya está configurada
        }
      }

      setSuccess(true)
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        // Determinar a dónde redirigir según el tipo de usuario
        if (userData?.user_type === 'admin') {
          navigate('/admin')
        } else {
          navigate('/mi-cuenta')
        }
      }, 2000)

    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'Error al configurar la cuenta')
    } finally {
      setSubmitting(false)
    }
  }

  const passwordStrength = getPasswordStrength()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Procesando invitación...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Cuenta Configurada!</h1>
          <p className="text-gray-600 mb-4">
            Tu cuenta ha sido configurada exitosamente. Serás redirigido automáticamente.
          </p>
          <div className="flex items-center justify-center gap-2 text-primary-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Redirigiendo...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error && !userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enlace Inválido</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="btn-primary w-full"
          >
            Ir al Inicio de Sesión
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="max-w-lg w-full">
        {/* Logo y título */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Proyecty</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">¡Bienvenido!</h1>
          <p className="text-gray-600 mt-2">Completa tu registro para acceder a la plataforma</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email (solo lectura) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="inline h-4 w-4 mr-1" />
                Email
              </label>
              <input
                type="email"
                value={userData?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">El email no puede ser modificado</p>
            </div>

            {/* Nombre completo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline h-4 w-4 mr-1" />
                Nombre Completo *
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Tu nombre completo"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="inline h-4 w-4 mr-1" />
                Teléfono
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="+57 300 123 4567"
              />
            </div>

            {/* Documento */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Doc.</label>
                <select
                  name="document_type"
                  value={formData.document_type}
                  onChange={handleChange}
                  className="w-full px-3 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                  <option value="NIT">NIT</option>
                  <option value="PAS">Pasaporte</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                <input
                  type="text"
                  name="document_number"
                  value={formData.document_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Número de documento"
                />
              </div>
            </div>

            {/* Ciudad y Departamento */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Ciudad
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Separador */}
            <div className="border-t border-gray-200 pt-5">
              <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Configura tu contraseña
              </h3>

              {/* Contraseña */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Mínimo 8 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  
                  {/* Indicador de fortaleza */}
                  {passwordStrength && (
                    <div className="mt-2">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: passwordStrength.width }}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${
                        passwordStrength.text === 'Débil' ? 'text-red-600' :
                        passwordStrength.text === 'Media' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        Seguridad: {passwordStrength.text}
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1">
                    Debe incluir mayúscula, minúscula y número
                  </p>
                </div>

                {/* Confirmar Contraseña */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar Contraseña *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        formData.confirmPassword && formData.password !== formData.confirmPassword
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200'
                      }`}
                      placeholder="Repite tu contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1">Las contraseñas no coinciden</p>
                  )}
                </div>
              </div>
            </div>

            {/* Botón submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-3 text-lg flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Configurando cuenta...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Completar Registro
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <button 
            onClick={() => navigate('/login')}
            className="text-primary-600 hover:underline font-medium"
          >
            Inicia sesión
          </button>
        </p>
      </div>
    </div>
  )
}
