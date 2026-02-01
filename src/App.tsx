import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'

// Layouts
import { AdminLayout } from './layouts/AdminLayout'
import { AuthLayout } from './layouts/AuthLayout'

// Pages - Auth
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'

// Pages - Admin
import { DashboardPage } from './pages/admin/DashboardPage'
import { LoansPage } from './pages/admin/LoansPage'
import { UsersPage } from './pages/admin/UsersPage'
import { TransactionsPage } from './pages/admin/TransactionsPage'
import { ReportsPage } from './pages/admin/ReportsPage'
import { PropertiesPage } from './pages/admin/PropertiesPage'
import { MortgageDetailPage } from './pages/admin/MortgageDetailPage'
import { UnauthorizedPage } from './pages/UnauthorizedPage'
import { MyAccountPage } from './pages/user/MyAccountPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />
              <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="propiedades" element={<PropertiesPage />} />
              <Route path="hipotecas/:id" element={<MortgageDetailPage />} />
              <Route path="loans" element={<LoansPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>

            {/* User Portal - para usuarios no admin */}
            <Route
              path="/mi-cuenta"
              element={
                <ProtectedRoute allowedRoles={['borrower', 'investor', 'admin']}>
                  <MyAccountPage />
                </ProtectedRoute>
              }
            />

            {/* Unauthorized */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Redirect root to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* 404 - redirigir a login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
