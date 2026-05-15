'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { FileText, Search, Users, Plus, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, orgs, activeOrg, setActiveOrgId, signOut, loading } = useAuth()
  const pathname = usePathname()
  const router   = useRouter()
  const [orgMenuOpen, setOrgMenuOpen] = useState(false)

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '2px solid #d8d4cc', borderTopColor: '#1a1916', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  if (!user) { router.push('/login'); return null }

  const navItems = [
    { href: '/reports',        icon: FileText, label: '報告書' },
    { href: '/reports/search', icon: Search,   label: '検索' },
    { href: '/groups',         icon: Users,    label: 'グループ' },
  ]

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header style={{ background: '#1a1916', color: '#fff', padding: '0 16px', height: 48, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 40 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.12em', opacity: 0.6 }}>FIELD REPORT</span>

        {/* Org switcher */}
        {orgs.length > 0 && (
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <button onClick={() => setOrgMenuOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeOrg?.name ?? '—'}</span>
              <ChevronDown size={11} />
            </button>
            {orgMenuOpen && (
              <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fff', color: '#1a1916', borderRadius: 12, border: '0.5px solid #d8d4cc', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: 180, padding: '4px 0', zIndex: 50 }}>
                {orgs.map(o => (
                  <button key={o.id} onClick={() => { setActiveOrgId(o.id); setOrgMenuOpen(false) }}
                    style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: o.id === activeOrg?.id ? 600 : 400, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{o.name}</span>
                    {o.is_admin && <span style={{ fontSize: 10, color: '#9c9890' }}>admin</span>}
                  </button>
                ))}
                <div style={{ borderTop: '0.5px solid #d8d4cc', margin: '4px 0' }} />
                <button onClick={() => { router.push('/groups'); setOrgMenuOpen(false) }}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, color: '#6b6760', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  グループを管理 →
                </button>
              </div>
            )}
          </div>
        )}

        <button onClick={signOut} title="ログアウト"
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4, marginLeft: orgs.length ? 0 : 'auto', display: 'flex' }}>
          <LogOut size={16} />
        </button>
      </header>

      <main style={{ flex: 1, paddingBottom: 72 }}>
        {children}
      </main>

      {/* Bottom nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid #d8d4cc', display: 'flex', zIndex: 40, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/reports' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 8px', gap: 3, textDecoration: 'none', color: active ? '#1a1916' : '#9c9890', fontSize: 11 }}>
              <Icon size={20} strokeWidth={active ? 2 : 1.5} />
              <span>{label}</span>
            </Link>
          )
        })}
        <Link href="/reports/new" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 8px', gap: 3, textDecoration: 'none', color: '#9c9890', fontSize: 11 }}>
          <div style={{ width: 34, height: 34, background: '#1a1916', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -14 }}>
            <Plus size={18} color="#fff" />
          </div>
          <span style={{ marginTop: 2 }}>新規</span>
        </Link>
      </nav>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
