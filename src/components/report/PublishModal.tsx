'use client'
import { useState, useEffect } from 'react'
import type { Team, OrgMember, PermissionEntry, ReportPermissionLevel } from '@/types'
import { getTeams, getOrgMembers } from '@/lib/orgs'
import { publishWithPermissions } from '@/lib/reports'
import { X, Users, User, Globe, ChevronDown, Check, Loader2 } from 'lucide-react'

interface Props {
  reportId: string
  orgId: string
  isAdmin: boolean
  onDone: () => void
  onClose: () => void
}

export default function PublishModal({ reportId, orgId, isAdmin, onDone, onClose }: Props) {
  const [teams, setTeams]     = useState<Team[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])
  const [entries, setEntries] = useState<PermissionEntry[]>([])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [tab, setTab]         = useState<'team' | 'user'>('team')

  useEffect(() => {
    Promise.all([getTeams(orgId), getOrgMembers(orgId)])
      .then(([t, m]) => { setTeams(t); setMembers(m) })
  }, [orgId])

  function toggleEntry(type: 'team' | 'user', id: string, name: string) {
    const key = type === 'team' ? 'team_id' : 'user_id'
    const exists = entries.find(e => e[key] === id)
    if (exists) {
      setEntries(entries.filter(e => e[key] !== id))
    } else {
      setEntries([...entries, { [key]: id, level: 'viewer', label: name }])
    }
  }

  function setLevel(type: 'team' | 'user', id: string, level: ReportPermissionLevel) {
    const key = type === 'team' ? 'team_id' : 'user_id'
    setEntries(entries.map(e => e[key] === id ? { ...e, level } : e))
  }

  function isSelected(type: 'team' | 'user', id: string) {
    const key = type === 'team' ? 'team_id' : 'user_id'
    return entries.some(e => e[key] === id)
  }

  function getLevel(type: 'team' | 'user', id: string): ReportPermissionLevel {
    const key = type === 'team' ? 'team_id' : 'user_id'
    return entries.find(e => e[key] === id)?.level ?? 'viewer'
  }

  async function handlePublish() {
    setSaving(true)
    setError('')
    try {
      const sb = (await import('@/lib/supabase')).createClient()
      const { data: { user } } = await sb.auth.getUser()
      // 作成者を自動的にeditorとして追加
      const authorEntry: PermissionEntry = user
        ? { user_id: user.id, level: 'editor', label: 'あなた（作成者）' }
        : null as any
      const allEntries = authorEntry
        ? [authorEntry, ...entries.filter(e => e.user_id !== user?.id)]
        : entries
      await publishWithPermissions(reportId, allEntries)
      onDone()
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  const selectedCount = entries.length

  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, overflow: 'hidden', border: '0.5px solid #d8d4cc' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #d8d4cc', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Globe size={18} style={{ color: '#6b6760' }} aria-hidden />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 500, fontSize: 14 }}>報告書を公開する</p>
            <p style={{ fontSize: 12, color: '#6b6760', marginTop: 1 }}>
              アクセス権限を設定してから公開します。未指定のメンバーは閲覧者になります。
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b6760', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid #d8d4cc', padding: '0 20px' }}>
          {(['team', 'user'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '10px 0', marginRight: 20, fontSize: 13, fontFamily: 'inherit', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `2px solid ${tab === t ? '#1a1916' : 'transparent'}`, color: tab === t ? '#1a1916' : '#6b6760', fontWeight: tab === t ? 500 : 400 }}>
              {t === 'team' ? 'チーム単位' : 'ユーザー個別'}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ maxHeight: 280, overflowY: 'auto', padding: '8px 12px' }}>
          {tab === 'team' && (
            teams.length === 0
              ? <p style={{ padding: '20px 8px', fontSize: 13, color: '#6b6760', textAlign: 'center' }}>チームがありません。先にグループ管理でチームを作成してください。</p>
              : teams.map(team => (
                <PermRow
                  key={team.id}
                  icon={<Users size={15} />}
                  label={team.name}
                  sub={`${team.member_count ?? 0}人`}
                  selected={isSelected('team', team.id)}
                  level={getLevel('team', team.id)}
                  onToggle={() => toggleEntry('team', team.id, team.name)}
                  onLevel={lv => setLevel('team', team.id, lv)}
                />
              ))
          )}
          {tab === 'user' && (
            members.length === 0
              ? <p style={{ padding: '20px 8px', fontSize: 13, color: '#6b6760', textAlign: 'center' }}>メンバーがいません</p>
              : members.map(m => (
                <PermRow
                  key={m.user_id}
                  icon={<User size={15} />}
                  label={m.profiles?.display_name ?? '—'}
                  sub={m.is_admin ? 'admin' : 'member'}
                  selected={isSelected('user', m.user_id)}
                  level={getLevel('user', m.user_id)}
                  onToggle={() => toggleEntry('user', m.user_id, m.profiles?.display_name ?? '—')}
                  onLevel={lv => setLevel('user', m.user_id, lv)}
                />
              ))
          )}
        </div>

        {/* Selected summary */}
        {entries.length > 0 && (
          <div style={{ padding: '8px 20px', borderTop: '0.5px solid #d8d4cc', background: '#f5f4f0' }}>
            <p style={{ fontSize: 12, color: '#6b6760', marginBottom: 4 }}>設定済みの権限</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {entries.map((e, i) => (
                <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: e.level === 'editor' ? '#e6f1fb' : '#f5f4f0', color: e.level === 'editor' ? '#185fa5' : '#6b6760', border: '0.5px solid #d8d4cc' }}>
                  {e.label} · {e.level === 'editor' ? '編集' : '閲覧'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <div style={{ padding: '8px 20px', borderTop: '0.5px solid #d8d4cc' }}>
          <p style={{ fontSize: 12, color: '#9c9890' }}>
            ※ 指定されなかった組織メンバーは自動的に <strong>閲覧者</strong> になります
          </p>
        </div>

        {error && (
          <p style={{ padding: '0 20px 8px', fontSize: 13, color: '#c0392b' }}>{error}</p>
        )}

        {/* Actions */}
        <div style={{ padding: '12px 20px', borderTop: '0.5px solid #d8d4cc', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8, border: '0.5px solid #d8d4cc', background: 'none', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#1a1916' }}>
            キャンセル
          </button>
          <button onClick={handlePublish} disabled={saving}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#1a1916', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.6 : 1 }}>
            {saving && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            <Globe size={14} />
            公開する{selectedCount > 0 ? `（${selectedCount}件指定）` : '（全員閲覧者）'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PermRow({ icon, label, sub, selected, level, onToggle, onLevel }: {
  icon: React.ReactNode
  label: string
  sub: string
  selected: boolean
  level: ReportPermissionLevel
  onToggle: () => void
  onLevel: (lv: ReportPermissionLevel) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 8, cursor: 'pointer', background: selected ? '#f5f4f0' : 'transparent', marginBottom: 2 }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
        <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${selected ? '#1a1916' : '#d8d4cc'}`, background: selected ? '#1a1916' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {selected && <Check size={11} style={{ color: '#fff' }} />}
        </div>
        <div style={{ color: '#6b6760', flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#1a1916', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</p>
          <p style={{ fontSize: 11, color: '#9c9890' }}>{sub}</p>
        </div>
      </div>
      {selected && (
        <select value={level} onChange={e => onLevel(e.target.value as ReportPermissionLevel)}
          onClick={e => e.stopPropagation()}
          style={{ fontSize: 12, border: '0.5px solid #d8d4cc', borderRadius: 6, padding: '3px 6px', background: '#fff', color: '#1a1916', fontFamily: 'inherit', cursor: 'pointer' }}>
          <option value="viewer">閲覧のみ</option>
          <option value="editor">閲覧 + 編集</option>
        </select>
      )}
    </div>
  )
}
