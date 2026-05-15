import { createClient } from './supabase'
import type { Organization, OrgMember, OrgInvite, Team } from '@/types'

// ── Organizations ─────────────────────────────────────────────

export async function getMyOrgs(): Promise<Organization[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('org_members')
    .select('is_admin, organizations(*)')
    .order('joined_at')
  if (error) throw error
  return (data ?? []).map(m => ({
    ...(m.organizations as any),
    is_admin: m.is_admin,
  }))
}

export async function createOrg(name: string): Promise<string> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const slug = name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'org'

  const { data, error } = await sb
    .from('organizations')
    .insert({ name, slug })
    .select('id')
    .single()
  if (error) throw error

  await sb.from('org_members').insert({ org_id: data.id, user_id: user.id, is_admin: true })
  return data.id
}

// ── Members ───────────────────────────────────────────────────

export async function getOrgMembers(orgId: string): Promise<OrgMember[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('org_members')
    .select('*, profiles(display_name, avatar_url)')
    .eq('org_id', orgId)
    .order('joined_at')
  if (error) throw error
  return data ?? []
}

export async function setMemberAdmin(orgId: string, userId: string, isAdmin: boolean) {
  const sb = createClient()
  const { error } = await sb
    .from('org_members')
    .update({ is_admin: isAdmin })
    .eq('org_id', orgId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removeMember(orgId: string, userId: string) {
  const sb = createClient()
  const { error } = await sb
    .from('org_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId)
  if (error) throw error
}

// ── Invites ───────────────────────────────────────────────────

export async function createInvite(orgId: string, isAdmin = false, maxUses?: number): Promise<string> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await sb
    .from('org_invites')
    .insert({ org_id: orgId, is_admin: isAdmin, created_by: user.id, max_uses: maxUses ?? null })
    .select('token')
    .single()
  if (error) throw error
  return data.token
}

export async function getInvites(orgId: string): Promise<OrgInvite[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('org_invites')
    .select('*')
    .eq('org_id', orgId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function useOrgInvite(token: string) {
  const sb = createClient()
  const { data, error } = await sb.rpc('use_org_invite', { token_value: token })
  if (error) throw error
  return data as { ok?: boolean; error?: string; org_id?: string }
}

// ── Teams ─────────────────────────────────────────────────────

export async function getTeams(orgId: string): Promise<Team[]> {
  const sb = createClient()
  const { data, error } = await sb
    .from('teams')
    .select('*, team_members(count)')
    .eq('org_id', orgId)
    .order('created_at')
  if (error) throw error
  return (data ?? []).map((t: any) => ({
    ...t,
    member_count: t.team_members?.[0]?.count ?? 0,
  }))
}

export async function getTeamWithMembers(teamId: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('teams')
    .select('*, team_members(*, profiles(display_name, avatar_url))')
    .eq('id', teamId)
    .single()
  if (error) throw error
  return data
}

export async function createTeam(orgId: string, name: string): Promise<string> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await sb
    .from('teams')
    .insert({ org_id: orgId, name, created_by: user.id })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function deleteTeam(teamId: string) {
  const sb = createClient()
  const { error } = await sb.from('teams').delete().eq('id', teamId)
  if (error) throw error
}

export async function addTeamMember(teamId: string, userId: string) {
  const sb = createClient()
  const { error } = await sb
    .from('team_members')
    .insert({ team_id: teamId, user_id: userId })
  if (error && !error.message.includes('unique')) throw error
}

export async function removeTeamMember(teamId: string, userId: string) {
  const sb = createClient()
  const { error } = await sb
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId)
  if (error) throw error
}
