import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../services/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured)

  const setupUser = useCallback(async () => {
    if (!supabase) return
    try {
      await supabase.rpc('ensure_user_setup')
    } catch (err) {
      console.warn('ensure_user_setup error al inicializar sesión:', err)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }

    let isMounted = true

    // Obtener sesión existente
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      if (initialSession?.user) {
        setupUser()
      }
      setLoading(false)
    })

    // Escuchar cambios de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      if (currentSession?.user) {
        setupUser()
      }
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [setupUser])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase no está configurado')
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    if (data.user) {
      setUser(data.user)
      setSession(data.session)
      await setupUser()
    }
  }, [setupUser])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider')
  }
  return ctx
}
