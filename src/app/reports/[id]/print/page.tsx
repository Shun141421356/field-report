'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getReport, getPhotoUrl } from '@/lib/reports'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

const SIZE_OPTIONS = [
  { label: '1x', cols: 4 },
  { label: '1.5x', cols: 3 },
  { label: '2x', cols: 2 },
  { label: '3x', cols: 1 },
]

function PhotoSizeToggle({ value, onChange }: { value: number, onChange: (v: number) => void }) {
  const mono = "'IBM Plex Mono', monospace"
  return (
    <div style={{ display: 'inline-flex', gap: 2, background: '#f0ede8', borderRadius: 6, padding: 3 }}>
      {SIZE_OPTIONS.map((s, i) => (
        <button key={s.label} onClick={() => onChange(i)}
          style={{ padding: '3px 9px', borderRadius: 4, border: 'none', background: value === i ? '#1a1916' : 'transparent', color: value === i ? '#fff' : '#6b6760', cursor: 'pointer', fontFamily: mono, fontSize: 10, letterSpacing: '0.05em' }}>
          {s.label}
        </button>
      ))}
    </div>
  )
}

export default function PrintPage() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [galSize, setGalSize] = useState(1)
  const [secSizes, setSecSizes] = useState<Record<string, number>>({})

  useEffect(() => {
    getReport(id).then(setReport).catch(console.error).finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'monospace', fontSize: 13, color: '#9c9890', letterSpacing: '0.1em' }}>
      LOADING...
    </div>
  )
  if (!report) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'monospace', fontSize: 13 }}>
      REPORT NOT FOUND
    </div>
  )

  const sections = report.report_sections ?? []
  const galleryPhotos = (report.photos ?? []).filter((p: any) => p.section_id === null)
  const workedAt = format(parseISO(report.worked_at), 'yyyy.MM.dd', { locale: ja })
  const mono = "'IBM Plex Mono', 'Courier New', monospace"
  const sans = "'Noto Sans JP', sans-serif"

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Noto+Sans+JP:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #fff; color: #1a1916; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { margin: 15mm; size: A4; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          body { padding: 0 !important; }
        }
        @media screen {
          body { padding: 72px 40px 40px; background: #f5f4f0; }
          .sheet { max-width: 794px; margin: 0 auto; background: #fff; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
          .toolbar { position: fixed; top: 0; left: 0; right: 0; height: 52px; background: #1a1916; display: flex; align-items: center; padding: 0 20px; gap: 12px; z-index: 100; }
        }
      `}</style>

      {/* ツールバー（画面表示時のみ） */}
      <div className="no-print toolbar">
        <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', marginRight: 4 }}>FIELD REPORT</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => window.print()}
          style={{ background: '#fff', color: '#1a1916', border: 'none', borderRadius: 6, padding: '6px 18px', fontFamily: mono, fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer', fontWeight: 600 }}>
          PRINT / PDF
        </button>
        <button onClick={() => window.close()}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 14px', fontFamily: mono, fontSize: 11, color: '#fff', cursor: 'pointer', letterSpacing: '0.05em' }}>
          CLOSE
        </button>
      </div>

      <div className="sheet">
        {/* ─── Header ─── */}
        <div style={{ textAlign: 'center', fontFamily: mono, fontSize: 11, letterSpacing: '0.3em', fontWeight: 700, marginBottom: 10 }}>
          FIELD REPORT
        </div>
        <div style={{ borderBottom: '2px solid #1a1916', paddingBottom: 14, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.2em', color: '#9c9890', marginBottom: 6 }}>DOCUMENT CLASS: FIELD REPORT</div>
              <div style={{ fontFamily: sans, fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>{report.title}</div>
              {report.site_name && <div style={{ fontFamily: sans, fontSize: 13, color: '#6b6760', marginTop: 4 }}>{report.site_name}</div>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
              <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.15em', color: '#9c9890' }}>REPORT ID</div>
              <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, marginTop: 2 }}>FR-{report.worked_at?.replace(/-/g, '')}</div>
            </div>
          </div>
        </div>

        {/* ─── Meta ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', border: '1px solid #1a1916', marginBottom: 14 }}>
          {[
            { label: 'DATE', value: workedAt },
            { label: 'OPERATOR', value: report.profiles?.display_name ?? '—' },
          ].map((item, i, arr) => (
            <div key={item.label} style={{ padding: '8px 12px', borderRight: i < arr.length - 1 ? '1px solid #1a1916' : 'none' }}>
              <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.15em', color: '#9c9890', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 600 }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* ─── Location ─── */}
        {report.location && (
          <div style={{ border: '1px solid #1a1916', padding: '8px 12px', marginBottom: 14, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.15em', color: '#9c9890', whiteSpace: 'nowrap' }}>LOCATION</div>
            <div style={{ fontFamily: sans, fontSize: 12 }}>{report.location}</div>
          </div>
        )}

        {/* ─── Operations log ─── */}
        {sections.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.2em', color: '#9c9890', borderBottom: '1px solid #1a1916', paddingBottom: 4, marginBottom: 12 }}>OPERATIONS LOG</div>
            {sections.map((sec: any, i: number) => {
              const secPhotos = (report.photos ?? []).filter((p: any) => p.section_id === sec.id)
              const sSize = secSizes[sec.id] ?? 1
              const sCols = SIZE_OPTIONS[sSize].cols
              return (
                <div key={sec.id} style={{ borderLeft: '3px solid #1a1916', padding: '8px 12px', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.1em', background: '#1a1916', color: '#fff', padding: '2px 8px', whiteSpace: 'nowrap' }}>
                      OP-{String(i + 1).padStart(2, '0')}
                    </span>
                    {sec.title && <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 600 }}>{sec.title}</span>}
                  </div>
                  {sec.mode === 'text' && sec.content && (
                    <div style={{ fontFamily: sans, fontSize: 12, lineHeight: 1.8, color: '#333', whiteSpace: 'pre-wrap', marginBottom: secPhotos.length ? 10 : 0 }}>{sec.content}</div>
                  )}
                  {sec.mode === 'checklist' && (sec.checklist_items ?? []).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: secPhotos.length ? 10 : 0 }}>
                      {sec.checklist_items.map((item: any) => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: sans, fontSize: 12 }}>
                          <div style={{ width: 13, height: 13, border: '1.5px solid #1a1916', background: item.done ? '#1a1916' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, flexShrink: 0 }}>
                            {item.done ? '✓' : ''}
                          </div>
                          <span style={{ color: '#333' }}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {secPhotos.length > 0 && (
                    <>
                      <div className="no-print" style={{ marginBottom: 6 }}>
                        <PhotoSizeToggle value={sSize} onChange={v => setSecSizes(prev => ({ ...prev, [sec.id]: v }))} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sCols}, 1fr)`, gap: 6 }}>
                        {secPhotos.map((p: any) => (
                          <img key={p.id} src={getPhotoUrl(p.storage_path)} alt=""
                            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', border: '1px solid #d8d4cc', display: 'block' }} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ─── Summary ─── */}
        {report.summary && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.2em', color: '#9c9890', borderBottom: '1px solid #1a1916', paddingBottom: 4, marginBottom: 10 }}>SUMMARY / REMARKS</div>
            <div style={{ fontFamily: sans, fontSize: 12, lineHeight: 1.8, color: '#333', whiteSpace: 'pre-wrap' }}>{report.summary}</div>
          </div>
        )}

        {/* ─── Field evidence ─── */}
        {galleryPhotos.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #1a1916', paddingBottom: 4, marginBottom: 10 }}>
              <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.2em', color: '#9c9890' }}>FIELD EVIDENCE ({galleryPhotos.length} images)</div>
              <div className="no-print"><PhotoSizeToggle value={galSize} onChange={setGalSize} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${SIZE_OPTIONS[galSize].cols}, 1fr)`, gap: 6 }}>
              {galleryPhotos.map((p: any, i: number) => (
                <div key={p.id}>
                  <img src={getPhotoUrl(p.storage_path)} alt={`PHOTO ${String(i + 1).padStart(2, '0')}`}
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', border: '1px solid #d8d4cc', display: 'block' }} />
                  <div style={{ fontFamily: mono, fontSize: 8, color: '#9c9890', textAlign: 'center', marginTop: 2, letterSpacing: '0.1em' }}>
                    PHOTO {String(i + 1).padStart(2, '0')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Footer ─── */}
        <div style={{ borderTop: '2px solid #1a1916', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 8, letterSpacing: '0.1em', color: '#9c9890' }}>
          <span>FIELD REPORT SYSTEM</span>
          <span>{workedAt}</span>
        </div>
      </div>
    </>
  )
}
