'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { useAuth } from '@/hooks/useAuth'
import { saveReport } from '@/lib/reports'
import type { ReportFormData, SectionFormData } from '@/types'
import { Plus, X, Camera, Loader2, ArrowLeft } from 'lucide-react'

const WEATHERS = ['☀️ 晴れ', '⛅ 曇り', '🌧 雨', '❄️ 雪', '💨 強風']

function newSection(): SectionFormData {
  return { title: '', mode: 'text', content: '', items: [], photos: [] }
}

export default function NewReportPage() {
  const { activeOrg } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState<ReportFormData>({
    title: '', site_name: '', location: '',
    worked_at: new Date().toISOString().slice(0, 10),
    weather: '☀️ 晴れ', temperature: '', summary: '',
    sections: [newSection()], gallery_photos: [],
  })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [galPrev, setGalPrev] = useState<string[]>([])

  function upd(k: keyof ReportFormData, v: any) { setForm(f => ({ ...f, [k]: v })) }

  function addSection() { setForm(f => ({ ...f, sections: [...f.sections, newSection()] })) }
  function rmSection(i: number) { setForm(f => ({ ...f, sections: f.sections.filter((_, j) => j !== i) })) }
  function updSec(i: number, p: Partial<SectionFormData>) {
    setForm(f => { const s = [...f.sections]; s[i] = { ...s[i], ...p }; return { ...f, sections: s } })
  }
  function addItem(i: number) { updSec(i, { items: [...form.sections[i].items, { text: '', done: false }] }) }
  function updItem(si: number, ii: number, p: { text?: string; done?: boolean }) {
    const items = form.sections[si].items.map((it, j) => j === ii ? { ...it, ...p } : it)
    updSec(si, { items })
  }
  function rmItem(si: number, ii: number) { updSec(si, { items: form.sections[si].items.filter((_, j) => j !== ii) }) }

  const onDrop = useCallback((files: File[]) => {
    setForm(f => ({ ...f, gallery_photos: [...f.gallery_photos, ...files] }))
    files.forEach(f => setGalPrev(p => [...p, URL.createObjectURL(f)]))
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] } })

  async function handleSave() {
    if (!activeOrg) return
    setSaving(true); setError('')
    try {
      const id = await saveReport(activeOrg.id, form)
      router.push(`/reports/${id}`)
    } catch (e: any) { setError(e.message); setSaving(false) }
  }

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    width: '100%', border: '0.5px solid #d8d4cc', borderRadius: 8,
    padding: '9px 12px', fontSize: 14, outline: 'none', background: '#fff', ...style,
  })

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 48, zIndex: 30, background: '#f5f4f0', borderBottom: '0.5px solid #d8d4cc', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#1a1916', display: 'flex' }}>
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontWeight: 500, fontSize: 15, flex: 1 }}>新規報告書</span>
        <button onClick={handleSave} disabled={saving}
          style={{ background: '#1a1916', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.6 : 1 }}>
          {saving && <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />}
          下書き保存
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <div style={{ fontSize: 13, color: '#c0392b', background: '#fdf0ee', borderRadius: 10, padding: '10px 14px' }}>{error}</div>}

        {/* 基本情報 */}
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #d8d4cc', padding: 16 }}>
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', letterSpacing: '0.08em', marginBottom: 12 }}>基本情報</p>
          <input placeholder="タイトル（必須）" value={form.title} onChange={e => upd('title', e.target.value)}
            style={{ ...inp(), fontSize: 16, fontWeight: 500, marginBottom: 10 }} />
          <input placeholder="現場名 / 案件名" value={form.site_name} onChange={e => upd('site_name', e.target.value)}
            style={{ ...inp(), marginBottom: 10 }} />
          <input placeholder="場所・住所" value={form.location} onChange={e => upd('location', e.target.value)}
            style={{ ...inp(), marginBottom: 10 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 8 }}>
            <input type="date" value={form.worked_at} onChange={e => upd('worked_at', e.target.value)} style={inp()} />
            <select value={form.weather} onChange={e => upd('weather', e.target.value)}
              style={{ ...inp(), appearance: 'none' as any }}>
              {WEATHERS.map(w => <option key={w}>{w}</option>)}
            </select>
            <input type="number" placeholder="℃" value={form.temperature} onChange={e => upd('temperature', e.target.value)} style={inp()} />
          </div>
        </div>

        {/* 作業内容 */}
        <div>
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', letterSpacing: '0.08em', marginBottom: 10, paddingLeft: 2 }}>作業内容</p>
          {form.sections.map((sec, si) => (
            <SectionCard key={si} idx={si} sec={sec}
              onUpdate={p => updSec(si, p)}
              onRemove={() => rmSection(si)}
              onAddItem={() => addItem(si)}
              onUpdItem={(ii, p) => updItem(si, ii, p)}
              onRmItem={ii => rmItem(si, ii)}
            />
          ))}
          <button onClick={addSection}
            style={{ width: '100%', border: '2px dashed #d8d4cc', borderRadius: 14, padding: 12, background: 'none', fontSize: 13, color: '#9c9890', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 }}>
            <Plus size={15} /> 作業項目を追加
          </button>
        </div>

        {/* 総括 */}
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #d8d4cc', padding: 16 }}>
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', letterSpacing: '0.08em', marginBottom: 10 }}>総括 / 特記事項</p>
          <textarea placeholder="全体所見・問題点・次回申し送りなど..." value={form.summary} onChange={e => upd('summary', e.target.value)} rows={4}
            style={{ ...inp(), resize: 'vertical' as any, lineHeight: 1.7 }} />
        </div>

        {/* 現場写真 */}
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #d8d4cc', padding: 16 }}>
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', letterSpacing: '0.08em', marginBottom: 10 }}>現場写真（エビデンス）</p>
          <div {...getRootProps()}
            style={{ border: `2px dashed ${isDragActive ? '#1a1916' : '#d8d4cc'}`, borderRadius: 12, padding: '24px 16px', textAlign: 'center', cursor: 'pointer', background: isDragActive ? '#f0ede8' : 'transparent', transition: 'all 0.15s' }}>
            <input {...getInputProps()} />
            <Camera size={26} style={{ color: '#d8d4cc', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: '#9c9890' }}>タップまたはドロップで複数枚追加</p>
          </div>
          {galPrev.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 10 }}>
              {galPrev.map((url, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  <button onClick={() => {
                    setForm(f => ({ ...f, gallery_photos: f.gallery_photos.filter((_, j) => j !== i) }))
                    setGalPrev(p => p.filter((_, j) => j !== i))
                  }} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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

function SectionCard({ idx, sec, onUpdate, onRemove, onAddItem, onUpdItem, onRmItem }: {
  idx: number; sec: SectionFormData
  onUpdate: (p: Partial<SectionFormData>) => void
  onRemove: () => void
  onAddItem: () => void
  onUpdItem: (i: number, p: { text?: string; done?: boolean }) => void
  onRmItem: (i: number) => void
}) {
  const [prevs, setPrevs] = useState<string[]>([])

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    onUpdate({ photos: [...sec.photos, ...files] })
    files.forEach(f => setPrevs(p => [...p, URL.createObjectURL(f)]))
    e.target.value = ''
  }

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #d8d4cc', overflow: 'hidden', marginBottom: 10 }}>
      <div style={{ background: '#f0ede8', borderBottom: '0.5px solid #d8d4cc', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#185fa5', background: '#e6f1fb', padding: '2px 8px', borderRadius: 99 }}>STEP {idx + 1}</span>
        <input placeholder="作業項目名" value={sec.title} onChange={e => onUpdate({ title: e.target.value })}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 500, outline: 'none' }} />
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9c9890', display: 'flex' }}><X size={14} /></button>
      </div>
      <div style={{ padding: 14 }}>
        {/* mode switch */}
        <div style={{ display: 'inline-flex', background: '#f0ede8', borderRadius: 8, padding: 3, marginBottom: 12, fontSize: 12 }}>
          {(['text', 'checklist'] as const).map(m => (
            <button key={m} onClick={() => onUpdate({ mode: m, items: m === 'checklist' && !sec.items.length ? [{ text: '', done: false }] : sec.items })}
              style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: sec.mode === m ? '#fff' : 'transparent', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer', color: sec.mode === m ? '#1a1916' : '#9c9890', fontWeight: sec.mode === m ? 500 : 400 }}>
              {m === 'text' ? '📝 テキスト' : '☑ チェック'}
            </button>
          ))}
        </div>

        {sec.mode === 'text' ? (
          <textarea placeholder="作業内容を記入..." value={sec.content} onChange={e => onUpdate({ content: e.target.value })} rows={3}
            style={{ width: '100%', border: '0.5px solid #d8d4cc', borderRadius: 8, padding: '9px 12px', fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.7 }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sec.items.map((item, ii) => (
              <div key={ii} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f4f0', borderRadius: 8, padding: '7px 10px' }}>
                <input type="checkbox" checked={item.done} onChange={e => onUpdItem(ii, { done: e.target.checked })}
                  style={{ width: 15, height: 15, flexShrink: 0, accentColor: '#27735a' }} />
                <input placeholder="項目名..." value={item.text} onChange={e => onUpdItem(ii, { text: e.target.value })}
                  style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, outline: 'none' }} />
                <button onClick={() => onRmItem(ii)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d8d4cc', display: 'flex' }}><X size={12} /></button>
              </div>
            ))}
            <button onClick={onAddItem} style={{ fontSize: 12, color: '#9c9890', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '4px 2px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={12} /> 項目を追加
            </button>
          </div>
        )}

        {/* section photos */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          {prevs.map((url, i) => (
            <div key={i} style={{ position: 'relative', width: 56, height: 56 }}>
              <img src={url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '0.5px solid #d8d4cc' }} />
              <button onClick={() => {
                onUpdate({ photos: sec.photos.filter((_, j) => j !== i) })
                setPrevs(p => p.filter((_, j) => j !== i))
              }}
                style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={9} color="#fff" />
              </button>
            </div>
          ))}
          <label style={{ width: 56, height: 56, border: '1px dashed #d8d4cc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Camera size={18} style={{ color: '#d8d4cc' }} />
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotos} />
          </label>
        </div>
      </div>
    </div>
  )
}
