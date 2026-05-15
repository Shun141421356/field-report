'use client'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { searchReports } from '@/lib/reports'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Search, Globe } from 'lucide-react'

export default function SearchPage() {
  const { activeOrg } = useAuth()
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searched, setSearched] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!activeOrg || !query.trim()) return
    setSearched(true)
    startTransition(async () => {
      const res = await searchReports(activeOrg.id, query)
      setResults(res)
    })
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ padding: '20px 16px 12px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 14 }}>検索</h1>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '0.5px solid #d8d4cc', borderRadius: 12, padding: '0 12px' }}>
            <Search size={15} style={{ color: '#d8d4cc', flexShrink: 0 }} />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="現場名・場所・内容で検索..."
              style={{ flex: 1, border: 'none', fontSize: 14, outline: 'none', padding: '11px 0', background: 'transparent' }} />
          </div>
          <button type="submit" disabled={!query.trim() || isPending}
            style={{ background: '#1a1916', color: '#fff', border: 'none', borderRadius: 12, padding: '0 16px', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: (!query.trim() || isPending) ? 0.5 : 1 }}>
            検索
          </button>
        </form>
        <p style={{ fontSize: 11, color: '#9c9890', marginTop: 6 }}>※ 公開済みの報告書のみ検索できます</p>
      </div>

      <div style={{ padding: '0 16px 80px' }}>
        {isPending && <div style={{ textAlign: 'center', padding: 32, color: '#9c9890' }}>検索中...</div>}

        {searched && !isPending && results.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#9c9890' }}>
            <Search size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>「{query}」に一致する報告書がありません</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {results.map(r => (
            <Link key={r.id} href={`/reports/${r.id}`}
              style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #d8d4cc', padding: '12px 16px', textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{r.title}</span>
                <Globe size={11} style={{ color: '#0f6e56', flexShrink: 0 }} />
              </div>
              {r.site_name && <p style={{ fontSize: 12, color: '#6b6760', marginBottom: 4 }}>{r.site_name}</p>}
              <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#9c9890' }}>
                <span>{format(parseISO(r.worked_at), 'yyyy/M/d（E）', { locale: ja })}</span>
                {r.profiles?.display_name && <span>· {r.profiles.display_name}</span>}
                {r.location && <span>· {r.location}</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
