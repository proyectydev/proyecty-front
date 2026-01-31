import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle, User, Briefcase, Building2, Mail } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export function RegisterPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    document_type: 'CC',
    document_number: '',
    city: 'Cúcuta',
    department: 'Norte de Santander',
    acceptTerms: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Validar email
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // Validar contraseña fuerte
  const isStrongPassword = (password: string) => {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /[0-9]/.test(password)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validaciones mejoradas
      if (!formData.full_name.trim() || formData.full_name.trim().length < 3) {
        throw new Error('El nombre debe tener al menos 3 caracteres')
      }
      
      if (!formData.email.trim() || !isValidEmail(formData.email)) {
        throw new Error('Ingresa un email válido')
      }
      
      if (!isStrongPassword(formData.password)) {
        throw new Error('La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula y número')
      }
      
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Las contraseñas no coinciden')
      }
      
      if (!formData.acceptTerms) {
        throw new Error('Debes aceptar los términos y condiciones')
      }

      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Este email ya está registrado. Intenta iniciar sesión.')
        }
        throw authError
      }

      if (!authData.user) {
        throw new Error('Error al crear la cuenta')
      }

      // Verificar si requiere confirmación de email
      // Si identities está vacío o session es null, necesita confirmar
      const requiresConfirmation = !authData.session || authData.user.identities?.length === 0
      setNeedsEmailConfirmation(requiresConfirmation)

      // 2. Verificar si existe registro previo (creado por admin)
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email)
        .single()

      if (existingUser) {
        // Actualizar registro existente con los datos del auth
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            phone: formData.phone || null,
            document_type: formData.document_type,
            document_number: formData.document_number || null,
            city: formData.city,
            department: formData.department,
            is_online_user: true,
            is_verified: !requiresConfirmation,
          })
          .eq('email', formData.email)

        if (updateError) throw updateError
      } else {
        // 3. Crear registro en nuestra tabla users
        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone || null,
            document_type: formData.document_type,
            document_number: formData.document_number || null,
            city: formData.city,
            department: formData.department,
            user_type: 'borrower',
            is_verified: !requiresConfirmation,
            is_active: true,
            is_online_user: true,
          }])

        if (insertError) {
          if (insertError.code === '23505') {
            await supabase
              .from('users')
              .update({ 
                is_online_user: true,
                is_verified: !requiresConfirmation,
                phone: formData.phone || null,
                document_type: formData.document_type,
                document_number: formData.document_number || null,
              })
              .eq('email', formData.email)
          } else {
            throw insertError
          }
        }
      }

      setSuccess(true)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  // Pantalla de éxito
  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg mx-auto text-center">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Cuenta Creada!</h1>
        {needsEmailConfirmation ? (
          <>
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6">
              <Mail className="w-8 h-8 text-primary-500 mx-auto mb-2" />
              <p className="text-gray-700 font-medium mb-1">Revisa tu correo electrónico</p>
              <p className="text-gray-500 text-sm">
                Hemos enviado un enlace de confirmación a <strong>{formData.email}</strong>. 
                Haz clic en el enlace para activar tu cuenta.
              </p>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              ¿No lo ves? Revisa tu carpeta de spam.
            </p>
          </>
        ) : (
          <p className="text-gray-500 mb-6">
            Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.
          </p>
        )}
        <button
          onClick={() => navigate('/login')}
          className="btn-primary w-full py-3"
        >
          Ir a Iniciar Sesión
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg mx-auto">
      {/* Logo Premium */}
      <div className="text-center mb-6">
        <img 
          src="/assets/Logo-Proyecty-Colombia_FB.png" 
          alt="Proyecty Colombia" 
          className="h-16 mx-auto mb-4 drop-shadow-lg object-contain"
        />
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido a Proyecty</h1>
        <p className="text-gray-500 mt-1">Tu plataforma de financiamiento hipotecario</p>
      </div>

      {/* Servicios - Estilo Premium */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="group text-center p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl border-2 border-primary-200 hover:border-primary-400 hover:shadow-lg transition-all cursor-pointer">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md group-hover:scale-110 transition-transform">
            <User className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-gray-800 font-semibold">Solicita</p>
          <p className="text-xs text-primary-600 font-medium">Créditos</p>
        </div>
        <div className="group text-center p-4 bg-gradient-to-br from-dark-50 to-dark-100 rounded-xl border-2 border-dark-200 hover:border-dark-400 hover:shadow-lg transition-all cursor-pointer">
          <div className="w-12 h-12 bg-gradient-to-br from-dark-600 to-dark-800 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md group-hover:scale-110 transition-transform">
            <Briefcase className="w-6 h-6 text-primary-400" />
          </div>
          <p className="text-sm text-gray-800 font-semibold">Invierte</p>
          <p className="text-xs text-dark-600 font-medium">Tu Dinero</p>
        </div>
        <div className="group text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 hover:border-gray-400 hover:shadow-lg transition-all cursor-pointer">
          <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md group-hover:scale-110 transition-transform">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-gray-800 font-semibold">Gestiona</p>
          <p className="text-xs text-gray-600 font-medium">Hipotecas</p>
        </div>
      </div>

      {/* Separador */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-gray-500">Crea tu cuenta</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Nombre */}
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

        {/* Documento */}
        <div className="grid grid-cols-3 gap-3">
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
              <option value="Pasaporte">Pasaporte</option>
            </select>
          </div>
          <div className="col-span-2">
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
        </div>

        {/* Email */}
        <div>
          <label className="label">Correo Electrónico *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="input"
            placeholder="tu@email.com"
            required
          />
        </div>

        {/* Teléfono */}
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

        {/* Ciudad y Departamento */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ciudad</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="input"
              placeholder="Cúcuta"
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
              placeholder="Norte de Santander"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="label">Contraseña *</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input pr-10"
              placeholder="Mín. 8 caracteres, mayúscula, número"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {formData.password && !isStrongPassword(formData.password) && (
            <p className="text-xs text-orange-500 mt-1">
              Mínimo 8 caracteres, una mayúscula, una minúscula y un número
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="label">Confirmar Contraseña *</label>
          <input
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="input"
            placeholder="Repite tu contraseña"
            required
          />
          {formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
          )}
        </div>

        {/* Términos */}
        <div className="flex items-start gap-3 pt-2">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={formData.acceptTerms}
            onChange={handleChange}
            className="mt-1"
            id="terms"
          />
          <label htmlFor="terms" className="text-sm text-gray-600">
            Acepto los{' '}
            <a href="#" className="text-primary-600 hover:underline">términos y condiciones</a>
            {' '}y la{' '}
            <a href="#" className="text-primary-600 hover:underline">política de privacidad</a>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          ) : (
            'Crear Cuenta'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-primary-600 hover:underline font-medium">
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
