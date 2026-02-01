import { useState, useEffect } from 'react'
import { useNavigate, Navigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { signIn, user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [successMessage, setSuccessMessage] = useState('')

  // Detectar si viene de confirmar email
  useEffect(() => {
    const confirmed = searchParams.get('confirmed')
    const type = searchParams.get('type')
    if (confirmed === 'true' || type === 'signup') {
      setSuccessMessage('¡Tu cuenta ha sido verificada! Ahora puedes iniciar sesión.')
    }
  }, [searchParams])

  // Si ya está autenticado, redirigir según rol
  if (!authLoading && user) {
    if (user.user_type === 'admin') {
      return <Navigate to="/admin" replace />
    }
    return <Navigate to="/mi-cuenta" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error, user: loggedUser } = await signIn(email, password)
      
      if (error) {
        setError(error.message || 'Credenciales incorrectas. Verifica tu email y contraseña.')
        setLoading(false)
        return
      }

      if (loggedUser) {
        // Redirigir según tipo de usuario
        if (loggedUser.user_type === 'admin') {
          navigate('/admin', { replace: true })
        } else {
          navigate('/mi-cuenta', { replace: true })
        }
      }
      setLoading(false)
    } catch (err) {
      setError('Ocurrió un error. Por favor intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
      {/* Logo Premium */}
      <div className="text-center mb-8">
        <img 
          src="/assets/Logo-Proyecty-Colombia_FB.png" 
          alt="Proyecty Colombia" 
          className="h-20 mx-auto mb-4 drop-shadow-lg object-contain"
        />
        <p className="text-gray-500 mt-1 text-sm">Crowdlending Hipotecario</p>
        <div className="w-16 h-1 bg-gradient-to-r from-primary-400 to-primary-600 mx-auto mt-3 rounded-full"></div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="email" className="label">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="tu@email.com"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="label mb-0">
              Contraseña
            </label>
            <Link 
              to="/recuperar-contrasena" 
              className="text-sm text-primary-600 hover:text-primary-700 hover:underline font-medium"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-10"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-base font-semibold"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="text-primary-600 hover:text-primary-700 hover:underline font-semibold">
          Regístrate aquí
        </Link>
      </p>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-center text-xs text-gray-400">
          © 2026 Proyecty Colombia. Cúcuta, Norte de Santander.
        </p>
      </div>
    </div>
  )
}
