import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '../types/database'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null; user: User | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Función para obtener datos del usuario de nuestra tabla
  const fetchUserData = async (email: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
      
      if (error) {
        console.error('Error fetching user data:', error)
        return null
      }
      return data
    } catch (error) {
      console.error('Error in fetchUserData:', error)
      return null
    }
  }

  // Solo inicialización - verificar sesión existente
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user?.email) {
        const userData = await fetchUserData(session.user.email)
        setUser(userData)
      }
      
      setLoading(false)
    }

    initAuth()

    // Escuchar SOLO logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<{ error: Error | null; user: User | null }> => {
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        return { error: authError, user: null }
      }

      // El onAuthStateChange manejará el resto
      const userData = await fetchUserData(email)
      
      if (!userData) {
        await supabase.auth.signOut()
        return { error: new Error('Usuario no encontrado en el sistema'), user: null }
      }

      setUser(userData)
      return { error: null, user: userData }
    } catch (error) {
      return { error: error as Error, user: null }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
