import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { User } from '../types/database'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: User['user_type'][]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.user_type)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}
