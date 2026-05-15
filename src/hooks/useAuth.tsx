'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import type { Organization } from '@/types'
import { getMyOrgs } from '@/lib/orgs'

interface AuthCtx {
  user: User | null
  isSuperAdmin: boolean
  orgs: Organization[]
  activeOrg: Organization | null
  setActiveOrgId: (id: string) => void
  loading: boolean
  signOut: () => Promise<void>
  refreshOrgs: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null, isSuperAdmin: false, orgs: [], activeOrg: null,
  setActiveOrgId: () => {}, loading: true,
  signOut: async () => {}, refreshOrgs: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const sb = createClient()
  const [user, setUser]     = useState<User | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [orgs, setOrgs]     = useState<Organization[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      if (u) loadOrgs(u.id); else setLoading(false)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) loadOrgs(u.id); else { setOrgs([]); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadOrgs(userId?: string) {
    try {
      const list = await getMyOrgs()
      setOrgs(list)
      const stored = typeof window !== 'undefined' ? localStorage.getItem('activeOrgId') : null
      if (stored && list.find(o => o.id === stored)) setActiveId(stored)
      else if (list.length) setActiveId(list[0].id)
      // fetch is_super_admin
      const uid = userId ?? (await sb.auth.getUser()).data.user?.id
      console.log('uid:', uid)
      if (uid) {
        const { data, error } = await sb.from('profiles').select('is_super_admin').eq('id', uid).single()
        console.log('is_super_admin data:', data, 'error:', error)
        setIsSuperAdmin(data?.is_super_admin ?? false)
      }
    } finally { setLoading(false) }
  }

  function handleSetActiveOrgId(id: string) {
    setActiveId(id)
    localStorage.setItem('activeOrgId', id)
  }

  async function signOut() {
    await sb.auth.signOut()
    setUser(null); setOrgs([]); setActiveId(null); setIsSuperAdmin(false)
  }

  const activeOrg = orgs.find(o => o.id === activeId) ?? orgs[0] ?? null

  return (
    <Ctx.Provider value={{ user, isSuperAdmin, orgs, activeOrg, setActiveOrgId: handleSetActiveOrgId, loading, signOut, refreshOrgs: loadOrgs }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
