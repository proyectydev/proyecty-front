import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { 
  User, 
  Home, 
  TrendingUp, 
  FileText, 
  Bell, 
  LogOut,
  Clock,
  CheckCircle,
  Building2
} from 'lucide-react'

export function MyAccountPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-dark-800/80 backdrop-blur-sm border-b border-dark-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <img 
              src="/assets/Logo-Proyecty-Colombia_FB1.png" 
              alt="Proyecty" 
              className="h-10 object-contain"
            />
            <div className="flex items-center gap-4">
              <span className="text-gray-300 text-sm hidden sm:block">
                {user?.full_name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:block">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 sm:p-8 mb-8 text-white shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                ¡Bienvenido, {user?.full_name?.split(' ')[0]}!
              </h1>
              <p className="text-primary-100">
                Usuario Proyecty
              </p>
              <div className="flex items-center gap-2 mt-3">
                <CheckCircle className="w-4 h-4 text-green-300" />
                <span className="text-sm text-primary-100">Cuenta verificada</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Tu portal está en construcción
              </h2>
              <p className="text-gray-400 mb-4">
                Estamos trabajando para traerte la mejor experiencia. Muy pronto podrás:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary-400" />
                  Ver el estado de tus solicitudes de crédito
                </li>
                <li className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-primary-400" />
                  Consultar tus hipotecas activas
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-400" />
                  Ver el rendimiento de tus inversiones
                </li>
                <li className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary-400" />
                  Explorar nuevas oportunidades de inversión
                </li>
                <li className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary-400" />
                  Recibir notificaciones importantes
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* User Info Card */}
        <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-400" />
            Información de tu cuenta
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Nombre completo</p>
              <p className="text-white">{user?.full_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Correo electrónico</p>
              <p className="text-white">{user?.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Teléfono</p>
              <p className="text-white">{user?.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Documento</p>
              <p className="text-white">
                {user?.document_type} {user?.document_number || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">
            ¿Tienes preguntas? Contáctanos en{' '}
            <a href="mailto:soporte@proyecty.com" className="text-primary-400 hover:underline">
              soporte@proyecty.com
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
