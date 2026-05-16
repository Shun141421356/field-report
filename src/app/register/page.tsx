'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { useOrgInvite } from '@/lib/orgs'

function RegisterForm() {
  const sb = createClient()
  const router = useRouter()
  const params = useSearchParams()
  const inviteToken = params.get('invite')

  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { display_name: name } },
    })
    if (error) { setError(error.message); setLoading(false); return }

    if (inviteToken && data.session) {
      // セッションを明示的にセット
      await sb.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
      // セッション確立を待つ
      await new Promise(r => setTimeout(r, 500))
      const result = await useOrgInvite(inviteToken).catch(console.error)
      console.log('invite result:', result)
    }
    router.push('/reports')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f4f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: '#1a1916', borderRadius: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, fontSize: 22 }}>📋</div>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>現場レポート</h1>
          <p style={{ fontSize: 13, color: '#6b6760', marginTop: 4 }}>{inviteToken ? '招待から参加' : 'アカウント作成'}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #d8d4cc', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && <div style={{ fontSize: 13, color: '#c0392b', background: '#fdf0ee', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
          <label>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b6760', marginBottom: 4 }}>お名前</div>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              style={{ width: '100%', border: '0.5px solid #d8d4cc', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none' }}
              placeholder="田中 太郎" />
          </label>
          <label>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b6760', marginBottom: 4 }}>EMAIL</div>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', border: '0.5px solid #d8d4cc', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none' }}
              placeholder="you@example.com" />
          </label>
          <label>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#6b6760', marginBottom: 4 }}>PASSWORD（8文字以上）</div>
            <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', border: '0.5px solid #d8d4cc', borderRadius: 8, padding: '9px 12px', fontSize: 14, outline: 'none' }} />
          </label>
          <button type="submit" disabled={loading}
            style={{ background: '#1a1916', color: '#fff', border: 'none', borderRadius: 10, padding: 11, fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.6 : 1, marginTop: 4 }}>
            {loading ? '登録中...' : 'アカウントを作成'}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b6760', marginTop: 16 }}>
          既にお持ちの方は{' '}
          <Link href="/login" style={{ color: '#1a1916', fontWeight: 600 }}>ログイン</Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return <Suspense><RegisterForm /></Suspense>
}
