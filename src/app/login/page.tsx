'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const sb = createClient()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push('/reports')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: '#1a1916', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 22 }}>📋</div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>現場レポート</h1>
          <p style={{ fontSize: 13, color: '#6b6760', marginTop: 4 }}>ログイン</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #d8d4cc', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ fontSize: 13, color: '#c0392b', background: '#fdf0ee', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
          <label>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b6760', marginBottom: 4 }}>EMAIL</div>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', border: '0.5px solid #d8d4cc', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none' }}
              placeholder="you@example.com" />
          </label>
          <label>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b6760', marginBottom: 4 }}>PASSWORD</div>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', border: '0.5px solid #d8d4cc', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none' }} />
          </label>
          <button type="submit" disabled={loading}
            style={{ background: '#1a1916', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4 }}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b6760', marginTop: 16 }}>
          アカウントをお持ちでない方は{' '}
          <Link href="/register" style={{ color: '#1a1916', fontWeight: 600 }}>新規登録</Link>
        </p>
      </div>
    </div>
  )
}
