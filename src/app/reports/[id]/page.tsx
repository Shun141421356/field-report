'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { getReport, getPhotoUrl, unpublishReport, deleteReport } from '@/lib/reports'
import PublishModal from '@/components/report/PublishModal'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ArrowLeft, Globe, Lock, Trash2, MapPin, Calendar, Cloud, Users, User, Edit2, Printer } from 'lucide-react'

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, activeOrg } = useAuth()
  const [report, setReport]           = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [showPublish, setShowPublish] = useState(false)
  const [acting, setActing]           = useState(false)
  const [lightbox, setLightbox]       = useState<string | null>(null)

  useEffect(() => {
    getReport(id).then(setReport).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const isAuthor = report?.author_id === user?.id
  const isAdmin  = activeOrg?.is_admin ?? false
  const canEdit  = isAuthor || isAdmin

  async function handleUnpublish() {
    setActing(true)
    try { await unpublishReport(id); setReport((r: any) => ({ ...r, status: 'draft', report_permissions: [] })) }
    finally { setActing(false) }
  }

  async function handleDelete() {
    if (!confirm('この報告書を削除しますか？')) return
    setActing(true)
    try { await deleteReport(id); router.push('/reports') }
    catch { setActing(false) }
  }

  if (loading) return <Spin />
  if (!report) return <div style={{ textAlign: 'center', padding: 48, color: '#9c9890' }}>報告書が見つかりません</div>

  const galleryPhotos = (report.photos ?? []).filter((p: any) => p.section_id === null)
  const sections      = report.report_sections ?? []
  const perms         = report.report_permissions ?? []
  const published     = report.status === 'published'

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 48, zIndex: 30, background: '#f5f4f0', borderBottom: '0.5px solid #d8d4cc', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          <ArrowLeft size={18} />
        </button>
        <span style={{ flex: 1, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6, color: published ? '#0f6e56' : '#6b6760', background: published ? '#e8f7f0' : '#f0ede8', padding: '3px 10px', borderRadius: 99 }}>
          {published ? <><Globe size={12} /> 公開中</> : <><Lock size={12} /> 下書き</>}
        </span>
        {canEdit && (
          <div style={{ display: 'flex', gap: 6 }}>
            {published
              ? <button onClick={handleUnpublish} disabled={acting}
                  style={{ fontSize: 12, border: '0.5px solid #d8d4cc', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  非公開に戻す
                </button>
              : <button onClick={() => setShowPublish(true)}
                  style={{ fontSize: 12, border: 'none', background: '#0f6e56', color: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Globe size={12} /> 公開する
                </button>
            }
            <button onClick={() => router.push(`/reports/edit?id=${id}`)}
              style={{ fontSize: 12, border: '0.5px solid #d8d4cc', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Edit2 size={12} /> 編集
            </button>
            <button onClick={() => window.open(`/reports/${id}/print`, '_blank')}
              style={{ fontSize: 12, border: '0.5px solid #d8d4cc', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Printer size={12} /> PDF
            </button>
            {(isAuthor || isAdmin) && (
              <button onClick={handleDelete} disabled={acting}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: '#d8d4cc', display: 'flex' }}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Title block */}
        <div style={{ background: '#1a1916', color: '#fff', borderRadius: 16, padding: '20px 20px 16px' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3, marginBottom: 14 }}>{report.title}</h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Calendar size={13} style={{ flexShrink: 0 }} />
              {format(parseISO(report.worked_at), 'yyyy年M月d日（E）', { locale: ja })}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Cloud size={13} style={{ flexShrink: 0 }} />
              {report.weather ?? '—'}{report.temperature != null ? `  ${report.temperature}℃` : ''}
            </div>
            {report.site_name && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', gridColumn: '1/-1' }}>
                <User size={13} style={{ flexShrink: 0 }} />
                {report.site_name}
              </div>
            )}
            {report.location && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', gridColumn: '1/-1' }}>
                <MapPin size={13} style={{ flexShrink: 0 }} />
                {report.location}
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid rgba(255,255,255,0.1)', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            作成：{report.profiles?.display_name ?? '—'}
            {report.published_at && <span style={{ marginLeft: 12 }}>公開：{format(parseISO(report.published_at), 'M/d HH:mm', { locale: ja })}</span>}
          </div>
        </div>

        {/* Permission summary */}
        {published && perms.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #d8d4cc', padding: '12px 16px' }}>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', marginBottom: 8 }}>アクセス権限</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {perms.map((p: any) => (
                <span key={p.id} style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, background: p.level === 'editor' ? '#e6f1fb' : '#f0ede8', color: p.level === 'editor' ? '#185fa5' : '#6b6760' }}>
                  {p.team_id ? <Users size={11} /> : <User size={11} />}
                  {p.team_id ? (p.teams?.name ?? '—') : (p.profiles?.display_name ?? '—')}
                  <span style={{ opacity: 0.6 }}>· {p.level === 'editor' ? '編集' : '閲覧'}</span>
                </span>
              ))}
              <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99, background: '#f0ede8', color: '#9c9890' }}>
                その他 → 閲覧のみ
              </span>
            </div>
          </div>
        )}

        {/* Sections */}
        {sections.map((sec: any, i: number) => {
          const sp = (report.photos ?? []).filter((p: any) => p.section_id === sec.id)
          return (
            <div key={sec.id} style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #d8d4cc', overflow: 'hidden' }}>
              <div style={{ background: '#f0ede8', borderBottom: '0.5px solid #d8d4cc', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#185fa5', background: '#e6f1fb', padding: '2px 8px', borderRadius: 99 }}>STEP {i + 1}</span>
                {sec.title && <span style={{ fontSize: 13, fontWeight: 500 }}>{sec.title}</span>}
              </div>
              <div style={{ padding: 16 }}>
                {sec.mode === 'text' && sec.content && (
                  <p style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: '#1a1916' }}>{sec.content}</p>
                )}
                {sec.mode === 'checklist' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(sec.checklist_items ?? []).map((it: any) => (
                      <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: it.done ? '#9c9890' : '#1a1916' }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${it.done ? '#27735a' : '#d8d4cc'}`, background: it.done ? '#27735a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: '#fff' }}>
                          {it.done && '✓'}
                        </div>
                        <span style={{ textDecoration: it.done ? 'line-through' : 'none' }}>{it.text}</span>
                      </div>
                    ))}
                  </div>
                )}
                {sp.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                    {sp.map((p: any) => (
                      <img key={p.id} src={getPhotoUrl(p.storage_path)} alt=""
                        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in' }}
                        onClick={() => setLightbox(getPhotoUrl(p.storage_path))} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Summary */}
        {report.summary && (
          <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #d8d4cc', padding: 16 }}>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', marginBottom: 8 }}>総括 / 特記事項</p>
            <p style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{report.summary}</p>
          </div>
        )}

        {/* Gallery */}
        {galleryPhotos.length > 0 && (
          <div>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', marginBottom: 10, paddingLeft: 2 }}>
              現場写真（{galleryPhotos.length}枚）
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {galleryPhotos.map((p: any) => (
                <div key={p.id} style={{ aspectRatio: '1', borderRadius: 10, overflow: 'hidden' }}>
                  <img src={getPhotoUrl(p.storage_path)} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                    onClick={() => setLightbox(getPhotoUrl(p.storage_path))} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Publish modal */}
      {showPublish && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <PublishModal
            reportId={id}
            orgId={report.org_id}
            isAdmin={isAdmin}
            onDone={() => {
              setShowPublish(false)
              getReport(id).then(setReport)
            }}
            onClose={() => setShowPublish(false)}
          />
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <img src={lightbox} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </div>
  )
}

function Spin() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
      <div style={{ width: 22, height: 22, border: '2px solid #d8d4cc', borderTopColor: '#1a1916', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
