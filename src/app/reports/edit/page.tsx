'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/hooks/useAuth'
import { getReport, saveReport, getPhotoUrl, deletePhotos } from '@/lib/reports'
import type { ReportFormData, SectionFormData } from '@/types'
import { Plus, X, Camera, Loader2, ArrowLeft } from 'lucide-react'

const WEATHERS = ['☀️ 晴れ', '⛅ 曇り', '🌧 雨', '❄️ 雪', '💨 強風']
function newSection(): SectionFormData {
  return { title: '', mode: 'text', content: '', items: [], photos: [] }
}

function EditForm() {
  const { activeOrg } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const reportId = params.get('id')

  const [form, setForm] = useState<ReportFormData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [galPrev, setGalPrev] = useState<string[]>([])
  const [existingGalPhotos, setExistingGalPhotos] = useState<{id: string, url: string}[]>([])
  const [existingSecPhotos, setExistingSecPhotos] = useState<Record<string, {id: string, url: string}[]>>({})
  const [deletedPhotoIds, setDeletedPhotoIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('EditForm mounted, reportId:', reportId)
    if (!reportId) { setLoading(false); return }
    getReport(reportId)
      .then(r => {
        console.log('getReport ok:', r?.id)

        // 既存の現場写真（ギャラリー）
        const galPhotos = (r.photos ?? []).filter((p: any) => p.section_id === null)
        setExistingGalPhotos(galPhotos.map((p: any) => ({ id: p.id, url: getPhotoUrl(p.storage_path) })))

        // 既存のセクション写真
        const secPhotosMap: Record<string, {id: string, url: string}[]> = {}
        ;(r.report_sections ?? []).forEach((s: any) => {
          const sp = (r.photos ?? []).filter((p: any) => p.section_id === s.id)
          secPhotosMap[s.id] = sp.map((p: any) => ({ id: p.id, url: getPhotoUrl(p.storage_path) }))
        })
        setExistingSecPhotos(secPhotosMap)

        setForm({
          title: r.title ?? '',
          site_name: r.site_name ?? '',
          location: r.location ?? '',
          worked_at: r.worked_at ?? new Date().toISOString().slice(0, 10),
          weather: r.weather ?? '☀️ 晴れ',
          temperature: r.temperature?.toString() ?? '',
          summary: r.summary ?? '',
          sections: (r.report_sections ?? []).map((s: any) => ({
            id: s.id,
            title: s.title ?? '',
            mode: s.mode,
            content: s.content ?? '',
            items: (s.checklist_items ?? []).map((i: any) => ({ id: i.id, text: i.text, done: i.done })),
            photos: [],
          })),
          gallery_photos: [],
        })
      })
      .catch(e => console.error('getReport error:', e))
      .finally(() => setLoading(false))
  }, [reportId])

  function upd(k: keyof ReportFormData, v: any) {
    setForm(f => f ? { ...f, [k]: v } : f)
  }
  function updSec(i: number, p: Partial<SectionFormData>) {
    setForm(f => {
      if (!f) return f
      const s = [...f.sections]; s[i] = { ...s[i], ...p }
      return { ...f, sections: s }
    })
  }

  const onDrop = useCallback((files: File[]) => {
    setForm(f => f ? { ...f, gallery_photos: [...f.gallery_photos, ...files] } : f)
    files.forEach(f => setGalPrev(p => [...p, URL.createObjectURL(f)]))
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } })

  async function handleSave() {
    if (!activeOrg || !form || !reportId) return
    setSaving(true); setError('')
    try {
      // 削除対象の写真をDB・Storageから削除
      if (deletedPhotoIds.length) {
        await deletePhotos(deletedPhotoIds)
      }
      await saveReport(activeOrg.id, form, reportId)
      router.push(`/reports/${reportId}`)
    } catch (e: any) { setError(e.message); setSaving(false) }
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', border: '0.5px solid #d8d4cc', borderRadius: 8,
    padding: '9px 12px', fontSize: 14, outline: 'none', background: '#fff', ...style,
  })

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: 22, height: 22, border: '2px solid #d8d4cc', borderTopColor: '#1a1916', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!form) return <div style={{ textAlign: 'center', padding: 48, color: '#9c9890' }}>報告書が見つかりません</div>

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ position: 'sticky', top: 48, zIndex: 30, background: '#f5f4f0', borderBottom: '0.5px solid #d8d4cc', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#1a1916', display: 'flex' }}>
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontWeight: 500, fontSize: 15, flex: 1 }}>報告書を編集</span>
        <button onClick={handleSave} disabled={saving}
          style={{ background: '#1a1916', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.6 : 1 }}>
          {saving && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
          保存
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <div style={{ fontSize: 13, color: '#c0392b', background: '#fdf0ee', borderRadius: 10, padding: '10px 14px' }}>{error}</div>}

        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #d8d4cc', padding: 16 }}>
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', marginBottom: 12 }}>基本情報</p>
          <input placeholder="タイトル" value={form.title} onChange={e => upd('title', e.target.value)} style={{ ...inp(), fontSize: 16, fontWeight: 500, marginBottom: 10 }} />
          <input placeholder="現場名" value={form.site_name} onChange={e => upd('site_name', e.target.value)} style={{ ...inp(), marginBottom: 10 }} />
          <input placeholder="場所" value={form.location} onChange={e => upd('location', e.target.value)} style={{ ...inp(), marginBottom: 10 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 8 }}>
            <input type="date" value={form.worked_at} onChange={e => upd('worked_at', e.target.value)} style={inp()} />
            <select value={form.weather} onChange={e => upd('weather', e.target.value)} style={{ ...inp(), appearance: 'none' as any }}>
              {WEATHERS.map(w => <option key={w}>{w}</option>)}
            </select>
            <input type="number" placeholder="℃" value={form.temperature} onChange={e => upd('temperature', e.target.value)} style={inp()} />
          </div>
        </div>

        <div>
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', marginBottom: 10, paddingLeft: 2 }}>作業内容</p>
          {form.sections.map((sec, si) => (
            <div key={si} style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #d8d4cc', overflow: 'hidden', marginBottom: 10 }}>
              <div style={{ background: '#f0ede8', borderBottom: '0.5px solid #d8d4cc', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#185fa5', background: '#e6f1fb', padding: '2px 8px', borderRadius: 99 }}>STEP {si + 1}</span>
                <input placeholder="作業項目名" value={sec.title} onChange={e => updSec(si, { title: e.target.value })}
                  style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 500, outline: 'none' }} />
                <button onClick={() => setForm(f => f ? { ...f, sections: f.sections.filter((_, j) => j !== si) } : f)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9c9890', display: 'flex' }}><X size={14} /></button>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: 'inline-flex', background: '#f0ede8', borderRadius: 8, padding: 3, marginBottom: 12 }}>
                  {(['text', 'checklist'] as const).map(m => (
                    <button key={m} onClick={() => updSec(si, { mode: m, items: m === 'checklist' && !sec.items.length ? [{ text: '', done: false }] : sec.items })}
                      style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: sec.mode === m ? '#fff' : 'transparent', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer', color: sec.mode === m ? '#1a1916' : '#9c9890' }}>
                      {m === 'text' ? '📝 テキスト' : '☑ チェック'}
                    </button>
                  ))}
                </div>
                {sec.mode === 'text' ? (
                  <textarea value={sec.content} onChange={e => updSec(si, { content: e.target.value })} rows={3} placeholder="作業内容..."
                    style={{ width: '100%', border: '0.5px solid #d8d4cc', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.7 }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sec.items.map((item, ii) => (
                      <div key={ii} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f4f0', borderRadius: 8, padding: '7px 10px' }}>
                        <input type="checkbox" checked={item.done} onChange={e => { const items = sec.items.map((it, j) => j === ii ? { ...it, done: e.target.checked } : it); updSec(si, { items }) }} style={{ width: 15, height: 15, accentColor: '#27735a' }} />
                        <input value={item.text} onChange={e => { const items = sec.items.map((it, j) => j === ii ? { ...it, text: e.target.value } : it); updSec(si, { items }) }}
                          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, outline: 'none' }} placeholder="項目名..." />
                        <button onClick={() => updSec(si, { items: sec.items.filter((_, j) => j !== ii) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d8d4cc', display: 'flex' }}><X size={12} /></button>
                      </div>
                    ))}
                    <button onClick={() => updSec(si, { items: [...sec.items, { text: '', done: false }] })}
                      style={{ fontSize: 12, color: '#9c9890', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '4px 2px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Plus size={12} /> 項目を追加
                    </button>
                  </div>
                )}
                {/* section photos */}
                <SectionPhotoArea
                  photos={sec.photos}
                  existingPhotos={sec.id ? (existingSecPhotos[sec.id] ?? []) : []}
                  onAdd={files => updSec(si, { photos: [...sec.photos, ...files] })}
                  onRemove={i => updSec(si, { photos: sec.photos.filter((_, j) => j !== i) })}
                  onRemoveExisting={photoId => {
                    setDeletedPhotoIds(prev => [...prev, photoId])
                    setExistingSecPhotos(prev => ({ ...prev, [sec.id!]: (prev[sec.id!] ?? []).filter(p => p.id !== photoId) }))
                  }}
                />
              </div>
            </div>
          ))}
          <button onClick={() => setForm(f => f ? { ...f, sections: [...f.sections, newSection()] } : f)}
            style={{ width: '100%', border: '2px dashed #d8d4cc', borderRadius: 14, padding: 12, background: 'none', fontSize: 13, color: '#9c9890', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
            <Plus size={15} /> 作業項目を追加
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #d8d4cc', padding: 16 }}>
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', marginBottom: 10 }}>総括</p>
          <textarea value={form.summary} onChange={e => upd('summary', e.target.value)} rows={4} placeholder="全体所見・次回申し送りなど..."
            style={{ ...inp(), resize: 'vertical' as any, lineHeight: 1.7 }} />
        </div>

        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #d8d4cc', padding: 16 }}>
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', marginBottom: 10 }}>現場写真</p>
          {/* 既存写真 */}
          {existingGalPhotos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
              {existingGalPhotos.map(p => (
                <div key={p.id} style={{ position: 'relative', aspectRatio: '1' }}>
                  <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  <button onClick={() => {
                    setDeletedPhotoIds(prev => [...prev, p.id])
                    setExistingGalPhotos(prev => prev.filter(x => x.id !== p.id))
                  }}
                    style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={10} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* 新規追加 */}
          <div {...getRootProps()} style={{ border: `2px dashed ${isDragActive ? '#1a1916' : '#d8d4cc'}`, borderRadius: 12, padding: '24px 16px', textAlign: 'center', cursor: 'pointer' }}>
            <input {...getInputProps()} />
            <Camera size={26} style={{ color: '#d8d4cc', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: '#9c9890' }}>タップまたはドロップで追加</p>
          </div>
          {galPrev.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 10 }}>
              {galPrev.map((url, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  <button onClick={() => {
                    setForm(f => f ? { ...f, gallery_photos: f.gallery_photos.filter((_, j) => j !== i) } : f)
                    setGalPrev(p => p.filter((_, j) => j !== i))
                  }} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={10} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function EditReportPage() {
  return <Suspense fallback={<div style={{display:'flex',justifyContent:'center',padding:48}}><div style={{width:22,height:22,border:'2px solid #d8d4cc',borderTopColor:'#1a1916',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>}><EditForm /></Suspense>
}

function SectionPhotoArea({ photos, existingPhotos, onAdd, onRemove, onRemoveExisting }: {
  photos: File[]
  existingPhotos: {id: string, url: string}[]
  onAdd: (files: File[]) => void
  onRemove: (i: number) => void
  onRemoveExisting: (id: string) => void
}) {
  const [prevs, setPrevs] = useState<string[]>([])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    onAdd(files)
    files.forEach(f => setPrevs(p => [...p, URL.createObjectURL(f)]))
    e.target.value = ''
  }

  function handleRemove(i: number) {
    onRemove(i)
    setPrevs(p => p.filter((_, j) => j !== i))
  }

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
      {/* 既存写真 */}
      {existingPhotos.map(p => (
        <div key={p.id} style={{ position: 'relative', width: 56, height: 56 }}>
          <img src={p.url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '0.5px solid #d8d4cc' }} />
          <button onClick={() => onRemoveExisting(p.id)}
            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={9} color="#fff" />
          </button>
        </div>
      ))}
      {/* 新規写真 */}
      {prevs.map((url, i) => (
        <div key={i} style={{ position: 'relative', width: 56, height: 56 }}>
          <img src={url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '0.5px solid #d8d4cc' }} />
          <button onClick={() => handleRemove(i)}
            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={9} color="#fff" />
          </button>
        </div>
      ))}
      <label style={{ width: 56, height: 56, border: '1px dashed #d8d4cc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
        <Camera size={18} style={{ color: '#d8d4cc' }} />
        <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleInput} />
      </label>
    </div>
  )
}
