import { Link } from 'react-router-dom'
import { ShieldX, Home, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export function UnauthorizedPage() {
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-950 to-black flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* Icono */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Acceso No Autorizado
        </h1>

        {/* Mensaje */}
        <p className="text-gray-600 mb-6">
          {user ? (
            <>
              Tu cuenta de tipo <strong className="text-gold-600">{user.user_type === 'borrower' ? 'Deudor' : user.user_type === 'investor' ? 'Inversionista' : user.user_type}</strong> no tiene permisos para acceder al panel de administración.
            </>
          ) : (
            'No tienes permisos para acceder a esta sección.'
          )}
        </p>

        {/* Info adicional */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>¿Necesitas acceso?</strong><br />
            Contacta al administrador de Proyecty para solicitar los permisos necesarios.
          </p>
        </div>

        {/* Botones */}
        <div className="space-y-3">
          {user ? (
            <>
              <button
                onClick={handleLogout}
                className="w-full btn bg-gradient-to-r from-gold-500 to-gold-600 text-dark-900 font-semibold hover:from-gold-600 hover:to-gold-700 flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                Cerrar Sesión e Iniciar con Otra Cuenta
              </button>
              <Link
                to="/"
                className="w-full btn btn-secondary flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Ir al Inicio
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="w-full btn bg-gradient-to-r from-gold-500 to-gold-600 text-dark-900 font-semibold hover:from-gold-600 hover:to-gold-700 flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" />
              Iniciar Sesión
            </Link>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Proyecty Colombia
        </p>
      </div>
    </div>
  )
}
