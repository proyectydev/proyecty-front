import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle, User, Briefcase } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type UserType = 'borrower' | 'investor' | 'both'

export function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'type' | 'form' | 'success'>('type')
  const [userType, setUserType] = useState<UserType>('borrower')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
      // Validaciones
      if (!formData.full_name.trim()) {
        throw new Error('El nombre es requerido')
      }
      if (!formData.email.trim()) {
        throw new Error('El email es requerido')
      }
      if (formData.password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres')
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
            user_type: userType,
          }
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

      // 2. Verificar si existe registro previo (creado por admin)
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, pending_registration')
        .eq('email', formData.email)
        .single()

      if (existingUser) {
        // Actualizar registro existente
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            document_type: formData.document_type,
            document_number: formData.document_number,
            city: formData.city,
            department: formData.department,
            is_online_user: true,
            is_verified: true,
            pending_registration: false,
            auth_user_id: authData.user.id,
          })
          .eq('email', formData.email)

        if (updateError) throw updateError
      } else {
        // 3. Crear registro en nuestra tabla users
        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            auth_user_id: authData.user.id,
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            document_type: formData.document_type,
            document_number: formData.document_number,
            user_type: userType,
            city: formData.city,
            department: formData.department,
            is_verified: true,
            is_active: true,
            is_online_user: true,
          }])

        if (insertError) {
          // Si ya existe, probablemente el usuario fue pre-creado por admin
          if (insertError.code === '23505') {
            // Actualizar el registro existente con auth_user_id
            await supabase
              .from('users')
              .update({ 
                auth_user_id: authData.user.id,
                is_online_user: true,
                is_verified: true,
              })
              .eq('email', formData.email)
          } else {
            throw insertError
          }
        }
      }

      setStep('success')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  // Pantalla de selección de tipo
  if (step === 'type') {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-3xl">P</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Crear Cuenta</h1>
          <p className="text-gray-500 mt-1">¿Qué te gustaría hacer en Proyecty?</p>
        </div>

        <div className="space-y-4">
          {/* Opción Cliente */}
          <button
            onClick={() => {
              setUserType('borrower')
              setStep('form')
            }}
            className={`w-full p-6 border-2 rounded-xl text-left transition-all hover:border-primary-500 hover:bg-primary-50 ${
              userType === 'borrower' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Solicitar un Crédito</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Obtén financiamiento usando tu propiedad como garantía hipotecaria.
                </p>
              </div>
            </div>
          </button>

          {/* Opción Inversionista */}
          <button
            onClick={() => {
              setUserType('investor')
              setStep('form')
            }}
            className={`w-full p-6 border-2 rounded-xl text-left transition-all hover:border-primary-500 hover:bg-primary-50 ${
              userType === 'investor' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Invertir mi Dinero</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Invierte en créditos hipotecarios y obtén rendimientos atractivos.
                </p>
              </div>
            </div>
          </button>

          {/* Opción Ambos */}
          <button
            onClick={() => {
              setUserType('both')
              setStep('form')
            }}
            className={`w-full p-6 border-2 rounded-xl text-left transition-all hover:border-primary-500 hover:bg-primary-50 ${
              userType === 'both' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <div className="flex -space-x-1">
                  <User className="w-4 h-4 text-purple-600" />
                  <Briefcase className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Ambas Opciones</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Quiero poder solicitar créditos y también invertir.
                </p>
              </div>
            </div>
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-primary-600 hover:underline font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    )
  }

  // Pantalla de éxito
  if (step === 'success') {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg mx-auto text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Cuenta Creada!</h1>
        <p className="text-gray-500 mb-6">
          Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="btn-primary w-full py-3"
        >
          Iniciar Sesión
        </button>
      </div>
    )
  }

  // Formulario de registro
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center mx-auto mb-3">
          <span className="text-white font-bold text-xl">P</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">
          {userType === 'borrower' && 'Registro como Cliente'}
          {userType === 'investor' && 'Registro como Inversionista'}
          {userType === 'both' && 'Registro Completo'}
        </h1>
        <button 
          onClick={() => setStep('type')}
          className="text-sm text-primary-600 hover:underline mt-1"
        >
          ← Cambiar tipo
        </button>
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
              placeholder="Mínimo 6 caracteres"
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

        {/* Ubicación */}
        <div className="grid grid-cols-2 gap-3">
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
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
