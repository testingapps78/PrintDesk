import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_, sess) => setSession(sess))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) { setProfile(null); return }
    setProfileLoading(true)
    supabase.from('staff')
      .select('id,full_name,role,designation,ssm_code,permissions,is_active')
      .eq('id', session.user.id).single()
      .then(({ data, error }) => {
        if (!error && data) setProfile(data)
        setProfileLoading(false)
      })
  }, [session])

  const value = {
    session, profile,
    loading: session === undefined || (session && profileLoading && !profile),
    signOut: () => supabase.auth.signOut(),
    // Helper: check if user can access a page
    canAccess: (page) => {
      if (!profile) return false
      if (profile.role === 'clerk') return true
      const pages = profile.permissions?.pages || []
      return pages.includes(page)
    },
    isClerk: profile?.role === 'clerk',
    isManager: profile?.role === 'manager',
    canViewAll: profile?.role === 'clerk' || profile?.role === 'manager' || profile?.permissions?.view_all_records === true,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
