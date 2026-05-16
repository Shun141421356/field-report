'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  getOrgMembers, createOrg, deleteOrg, createInvite,
  setMemberAdmin, removeMember,
  getTeams, createTeam, deleteTeam, getTeamWithMembers, addTeamMember, removeTeamMember,
} from '@/lib/orgs'
import type { OrgMember, Team } from '@/types'
import { Plus, Copy, Check, Users, User, Trash2, ChevronRight, ArrowLeft, Shield } from 'lucide-react'

type View = 'top' | 'members' | 'teams' | 'team-detail' | 'invite' | 'new-org'

export default function GroupsPage() {
  const { activeOrg, orgs, refreshOrgs, isSuperAdmin, user } = useAuth()
  const [view, setView]         = useState<View>('top')
  const [members, setMembers]   = useState<OrgMember[]>([])
  const [teams, setTeams]       = useState<Team[]>([])
  const [activeTeam, setActiveTeam] = useState<any>(null)
  const [inviteUrl, setInviteUrl]   = useState('')
  const [copied, setCopied]         = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [newTeamName, setNewTeamName] = useState('')
  const [loading, setLoading]   = useState(false)
  const [acting, setActing]     = useState(false)

  const isAdmin = activeOrg?.is_admin ?? false

  useEffect(() => {
    if (!activeOrg) return
    if (view === 'members') loadMembers()
    if (view === 'teams') loadTeams()
  }, [view, activeOrg?.id])

  async function loadMembers() {
    setLoading(true)
    getOrgMembers(activeOrg!.id).then(setMembers).finally(() => setLoading(false))
  }
  async function loadTeams() {
    setLoading(true)
    getTeams(activeOrg!.id).then(setTeams).finally(() => setLoading(false))
  }

  async function openTeam(team: Team) {
    const data = await getTeamWithMembers(team.id)
    setActiveTeam(data)
    setView('team-detail')
  }

  async function handleCreateOrg() {
    if (!newOrgName.trim()) return
    console.log('isSuperAdmin:', isSuperAdmin)
    if (!isSuperAdmin) {
      alert('スーパーAdmin権限がありません')
      return
    }
    setActing(true)
    try { await createOrg(newOrgName); await refreshOrgs(); setView('top'); setNewOrgName('') }
    finally { setActing(false) }
  }

  async function handleCreateInvite(isAdmin: boolean) {
    if (!activeOrg) return
    setActing(true)
    try {
      const token = await createInvite(activeOrg.id, isAdmin)
      const url = `${window.location.origin}/register?invite=${token}`
      setInviteUrl(url)
      setView('invite')
    } finally { setActing(false) }
  }

  async function handleCreateTeam() {
    if (!activeOrg || !newTeamName.trim()) return
    setActing(true)
    try { await createTeam(activeOrg.id, newTeamName); setNewTeamName(''); await loadTeams() }
    finally { setActing(false) }
  }

  async function handleAddToTeam(userId: string) {
    if (!activeTeam) return
    await addTeamMember(activeTeam.id, userId)
    const data = await getTeamWithMembers(activeTeam.id)
    setActiveTeam(data)
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const S = {
    page: { maxWidth: 640, margin: '0 auto', padding: '20px 16px 80px' } as React.CSSProperties,
    card: { background: '#fff', borderRadius: 14, border: '0.5px solid #d8d4cc', overflow: 'hidden' } as React.CSSProperties,
    row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '0.5px solid #f0ede8' } as React.CSSProperties,
    back: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#6b6760', marginBottom: 16, fontFamily: 'inherit', padding: 0 } as React.CSSProperties,
    btn: (primary?: boolean) => ({ background: primary ? '#1a1916' : 'none', color: primary ? '#fff' : '#1a1916', border: primary ? 'none' : '0.5px solid #d8d4cc', borderRadius: 10, padding: '9px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 } as React.CSSProperties),
  }

  // ── invite view ───────────────────────────────────────────
  if (view === 'invite') return (
    <div style={S.page}>
      <button style={S.back} onClick={() => setView('top')}><ArrowLeft size={16} /> 戻る</button>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>招待URLを共有</h2>
      <div style={S.card}>
        <div style={{ padding: 16 }}>
          <p style={{ fontSize: 13, color: '#6b6760', marginBottom: 12 }}>このURLをメンバーに送ってください。有効期限は7日間です。</p>
          <div style={{ display: 'flex', gap: 8, background: '#f5f4f0', borderRadius: 10, padding: '10px 14px', alignItems: 'center' }}>
            <p style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: '#6b6760', wordBreak: 'break-all' }}>{inviteUrl}</p>
            <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, color: copied ? '#0f6e56' : '#9c9890' }}>
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── new org view ──────────────────────────────────────────
  if (view === 'new-org') return (
    <div style={S.page}>
      <button style={S.back} onClick={() => setView('top')}><ArrowLeft size={16} /> 戻る</button>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>新規組織を作成</h2>
      <div style={S.card}>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input placeholder="組織名（例：○○建設 東京支店）" value={newOrgName} onChange={e => setNewOrgName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
            style={{ border: '0.5px solid #d8d4cc', borderRadius: 8, padding: '10px 12px', fontSize: 14, outline: 'none' }} />
          <button onClick={handleCreateOrg} disabled={acting || !newOrgName.trim()} style={S.btn(true)}>
            {acting ? '作成中...' : '作成する'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── members view ──────────────────────────────────────────
  if (view === 'members') return (
    <div style={S.page}>
      <button style={S.back} onClick={() => setView('top')}><ArrowLeft size={16} /> 戻る</button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>メンバー（{members.length}人）</h2>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => handleCreateInvite(false)} style={S.btn()}>メンバー招待</button>
            <button onClick={() => handleCreateInvite(true)} style={S.btn()}>管理者招待</button>
          </div>
        )}
      </div>
      {loading ? <p style={{ color: '#9c9890', textAlign: 'center', padding: 32 }}>読み込み中...</p> : (
        <div style={S.card}>
          {members.map((m, i) => (
            <div key={m.id} style={{ ...S.row, borderBottom: i === members.length - 1 ? 'none' : S.row.borderBottom }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500, flexShrink: 0 }}>
                {(m.profiles?.display_name ?? 'U')[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.profiles?.display_name ?? '—'}</p>
                <p style={{ fontSize: 12, color: '#9c9890' }}>{m.is_admin ? '管理者' : 'メンバー'}</p>
              </div>
              {isAdmin && m.is_admin && <Shield size={14} style={{ color: '#9c9890' }} />}
              {isAdmin && m.user_id !== user?.id && (
                <button onClick={() => {
                  if (!confirm(`「${m.profiles?.display_name ?? 'このメンバー'}」を削除しますか？`)) return
                  removeMember(activeOrg!.id, m.user_id).then(loadMembers)
                }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d8d4cc' }}>
                  <Trash2 size={14} />
                </button>
              )}
              {m.user_id === user?.id && (
                <span style={{ fontSize: 11, color: '#9c9890', background: '#f0ede8', padding: '2px 8px', borderRadius: 99 }}>自分</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ── team detail ───────────────────────────────────────────
  if (view === 'team-detail' && activeTeam) {
    const teamMemberIds = new Set((activeTeam.team_members ?? []).map((m: any) => m.user_id))
    const nonMembers    = members.filter(m => !teamMemberIds.has(m.user_id))
    return (
      <div style={S.page}>
        <button style={S.back} onClick={() => setView('teams')}><ArrowLeft size={16} /> チーム一覧</button>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{activeTeam.name}</h2>
        <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', marginBottom: 8 }}>メンバー（{activeTeam.team_members?.length ?? 0}人）</p>
        <div style={{ ...S.card, marginBottom: 14 }}>
          {(activeTeam.team_members ?? []).length === 0 && (
            <p style={{ padding: '16px', fontSize: 13, color: '#9c9890', textAlign: 'center' }}>まだメンバーがいません</p>
          )}
          {(activeTeam.team_members ?? []).map((m: any, i: number) => (
            <div key={m.id} style={{ ...S.row, borderBottom: i === activeTeam.team_members.length - 1 ? 'none' : S.row.borderBottom }}>
              <User size={16} style={{ color: '#9c9890' }} />
              <span style={{ flex: 1, fontSize: 14 }}>{m.profiles?.display_name ?? '—'}</span>
              {isAdmin && (
                <button onClick={() => removeTeamMember(activeTeam.id, m.user_id).then(() => getTeamWithMembers(activeTeam.id).then(setActiveTeam))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d8d4cc' }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
        {isAdmin && nonMembers.length > 0 && (
          <>
            <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#9c9890', marginBottom: 8 }}>追加できるメンバー</p>
            <div style={S.card}>
              {nonMembers.map((m, i) => (
                <div key={m.id} style={{ ...S.row, borderBottom: i === nonMembers.length - 1 ? 'none' : S.row.borderBottom }}>
                  <User size={16} style={{ color: '#9c9890' }} />
                  <span style={{ flex: 1, fontSize: 14 }}>{m.profiles?.display_name ?? '—'}</span>
                  <button onClick={() => handleAddToTeam(m.user_id)}
                    style={{ background: 'none', border: '0.5px solid #d8d4cc', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    追加
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // ── teams view ────────────────────────────────────────────
  if (view === 'teams') return (
    <div style={S.page}>
      <button style={S.back} onClick={() => setView('top')}><ArrowLeft size={16} /> 戻る</button>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>チーム</h2>
      {loading ? <p style={{ color: '#9c9890', textAlign: 'center', padding: 32 }}>読み込み中...</p> : (
        <>
          <div style={{ ...S.card, marginBottom: 12 }}>
            {teams.length === 0 && <p style={{ padding: 16, fontSize: 13, color: '#9c9890', textAlign: 'center' }}>チームがありません</p>}
            {teams.map((t, i) => (
              <button key={t.id} onClick={() => { setMembers([]); loadMembers().then(() => openTeam(t)) }}
                style={{ ...S.row, borderBottom: i === teams.length - 1 ? 'none' : S.row.borderBottom, width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                <Users size={16} style={{ color: '#9c9890', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: '#9c9890' }}>{t.member_count}人</p>
                </div>
                {isAdmin && (
                  <button onClick={e => { e.stopPropagation(); if (confirm(`「${t.name}」を削除しますか？`)) deleteTeam(t.id).then(loadTeams) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d8d4cc', padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                )}
                <ChevronRight size={15} style={{ color: '#d8d4cc' }} />
              </button>
            ))}
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="新しいチーム名" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                style={{ flex: 1, border: '0.5px solid #d8d4cc', borderRadius: 10, padding: '9px 12px', fontSize: 14, outline: 'none' }} />
              <button onClick={handleCreateTeam} disabled={acting || !newTeamName.trim()} style={S.btn(true)}>
                <Plus size={14} /> 作成
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )

  // ── top view ──────────────────────────────────────────────
  return (
    <div style={S.page}>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>グループ管理</h1>
      {activeOrg && <p style={{ fontSize: 12, color: '#9c9890', marginBottom: 20 }}>{activeOrg.name}</p>}

      {activeOrg && (
        <div style={{ ...S.card, marginBottom: 14 }}>
          {[
            { label: 'メンバー管理', sub: 'メンバーの招待・削除', icon: <User size={18} style={{ color: '#6b6760' }} />, action: () => { setView('members') } },
            { label: 'チーム管理', sub: '部署・グループの作成', icon: <Users size={18} style={{ color: '#6b6760' }} />, action: () => { setView('teams') } },
          ].map(({ label, sub, icon, action }, i, arr) => (
            <button key={label} onClick={action}
              style={{ ...S.row, borderBottom: i === arr.length - 1 ? 'none' : S.row.borderBottom, width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <div style={{ width: 36, height: 36, background: '#f0ede8', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{label}</p>
                <p style={{ fontSize: 12, color: '#9c9890' }}>{sub}</p>
              </div>
              <ChevronRight size={15} style={{ color: '#d8d4cc' }} />
            </button>
          ))}
        </div>
      )}

      {/* Switch org */}
      {orgs.length > 1 && (
        <div style={{ ...S.card, marginBottom: 14 }}>
          <p style={{ padding: '10px 16px 6px', fontSize: 11, fontFamily: 'monospace', color: '#9c9890' }}>所属組織</p>
          {orgs.map((o, i) => (
            <div key={o.id} style={{ ...S.row, borderBottom: i === orgs.length - 1 ? 'none' : S.row.borderBottom }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: o.id === activeOrg?.id ? 600 : 400 }}>{o.name}</p>
                <p style={{ fontSize: 12, color: '#9c9890' }}>{o.is_admin ? '管理者' : 'メンバー'}</p>
              </div>
              {o.id === activeOrg?.id && <span style={{ fontSize: 11, color: '#0f6e56', background: '#e8f7f0', padding: '2px 8px', borderRadius: 99 }}>選択中</span>}
              {isSuperAdmin && (
                <button onClick={async () => {
                  if (!confirm(`「${o.name}」を削除しますか？この操作は取り消せません。`)) return
                  await deleteOrg(o.id)
                  await refreshOrgs()
                }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d8d4cc', padding: 4, marginLeft: 4 }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isSuperAdmin && (
        <button onClick={() => setView('new-org')}
          style={{ width: '100%', border: '2px dashed #d8d4cc', borderRadius: 14, padding: '12px', background: 'none', fontSize: 13, color: '#9c9890', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}>
          <Plus size={15} /> 新しい組織を作成
        </button>
      )}
    </div>
  )
}
