'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { listReports, getPhotoUrl } from '@/lib/reports'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { FileText, Globe, Lock, ChevronRight } from 'lucide-react'

const C = {
  card: { background: '#fff', borderRadius: 16, border: '0.5px solid #d8d4cc', padding: 12, display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' } as React.CSSProperties,
  thumb: { width: 60, height: 60, borderRadius: 10, border: '0.5px solid #d8d4cc', background: '#f0ede8', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
}

export default function ReportsPage() {
  const { activeOrg, user } = useAuth()
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeOrg) return
    setLoading(true)
    listReports(activeOrg.id).then(setReports).finally(() => setLoading(false))
  }, [activeOrg?.id])

  if (!activeOrg) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
      <p style={{ fontSize: 14, color: '#6b6760', marginBottom: 16 }}>組織に参加してください</p>
      <Link href="/groups" style={{ background: '#1a1916', color: '#fff', borderRadius: 12, padding: '10px 20px', fontSize: 14, textDecoration: 'none', display: 'inline-block' }}>
        組織を作成・参加する
      </Link>
    </div>
  )

  // group by month
  const byMonth: Record<string, any[]> = {}
  reports.forEach(r => {
    const key = r.worked_at.slice(0, 7)
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(r)
  })

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ padding: '20px 16px 12px' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>報告書</h1>
        <p style={{ fontSize: 12, color: '#9c9890', marginTop: 2 }}>{activeOrg.name}</p>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: 22, height: 22, border: '2px solid #d8d4cc', borderTopColor: '#1a1916', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {!loading && reports.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px' }}>
          <FileText size={36} style={{ color: '#d8d4cc', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#6b6760' }}>まだ報告書がありません</p>
          <Link href="/reports/new" style={{ marginTop: 16, display: 'inline-block', background: '#1a1916', color: '#fff', borderRadius: 12, padding: '10px 20px', fontSize: 14, textDecoration: 'none' }}>
            最初の報告書を作る
          </Link>
        </div>
      )}

      <div style={{ padding: '0 16px 16px' }}>
        {Object.entries(byMonth).map(([month, items]) => (
          <div key={month} style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', marginBottom: 8, letterSpacing: '0.05em' }}>
              {format(parseISO(month + '-01'), 'yyyy年 M月', { locale: ja })}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(r => {
                const thumb = r.photos?.find((p: any) => p.section_id === null)
                const isOwn = r.author_id === user?.id
                return (
                  <Link key={r.id} href={`/reports/${r.id}`} style={C.card}>
                    <div style={C.thumb}>
                      {thumb
                        ? <img src={getPhotoUrl(thumb.storage_path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <FileText size={20} style={{ color: '#d8d4cc' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</p>
                      {r.site_name && <p style={{ fontSize: 12, color: '#6b6760', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.site_name}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
                        <span style={{ fontSize: 11, color: '#9c9890' }}>{format(parseISO(r.worked_at), 'M/d（E）', { locale: ja })}</span>
                        {!isOwn && r.profiles?.display_name && <span style={{ fontSize: 11, color: '#9c9890' }}>· {r.profiles.display_name}</span>}
                        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, borderRadius: 99, padding: '2px 7px', background: r.status === 'published' ? '#e8f7f0' : '#f0ede8', color: r.status === 'published' ? '#0f6e56' : '#6b6760' }}>
                          {r.status === 'published' ? <Globe size={10} /> : <Lock size={10} />}
                          {r.status === 'published' ? '公開中' : '下書き'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={15} style={{ color: '#d8d4cc', flexShrink: 0 }} />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
