import { createClient } from './supabase'
import type { ReportFormData, PermissionEntry } from '@/types'

const BUCKET = 'report-photos'

// ── Photo helpers ─────────────────────────────────────────────

export async function uploadPhoto(file: File, reportId: string): Promise<string> {
  const sb = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${reportId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type })
  if (error) throw error
  return path
}

export function getPhotoUrl(path: string): string {
  const sb = createClient()
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

// ── List ──────────────────────────────────────────────────────

export async function listReports(orgId: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('reports')
    .select(`
      id, title, site_name, worked_at, status, author_id, updated_at,
      profiles(display_name),
      photos(id, storage_path, section_id)
    `)
    .eq('org_id', orgId)
    .order('worked_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function searchReports(orgId: string, query: string) {
  const sb = createClient()
  // simple ILIKE fallback（pg_trgm or websearch）
  const { data, error } = await sb
    .from('reports')
    .select(`
      id, title, site_name, location, worked_at, status, author_id,
      profiles(display_name)
    `)
    .eq('org_id', orgId)
    .eq('status', 'published')
    .or(`title.ilike.%${query}%,site_name.ilike.%${query}%,location.ilike.%${query}%,summary.ilike.%${query}%`)
    .order('worked_at', { ascending: false })
    .limit(40)
  if (error) throw error
  return data ?? []
}

// ── Get single ────────────────────────────────────────────────

export async function getReport(id: string) {
  const sb = createClient()
  const { data, error } = await sb
    .from('reports')
    .select(`
      *,
      profiles(display_name, avatar_url),
      report_sections(*, checklist_items(*), photos(*)),
      photos!photos_report_id_fkey(*),
      report_permissions(*, teams(id, name), profiles(display_name))
    `)
    .eq('id', id)
    .single()
  if (error) throw error

  if (data.report_sections) {
    data.report_sections.sort((a: any, b: any) => a.position - b.position)
    data.report_sections.forEach((s: any) => {
      if (s.checklist_items) s.checklist_items.sort((a: any, b: any) => a.position - b.position)
      if (s.photos) s.photos.sort((a: any, b: any) => a.position - b.position)
    })
  }

  return data
}

// ── My access level ───────────────────────────────────────────

export async function getMyAccess(reportId: string): Promise<string> {
  const sb = createClient()
  const { data, error } = await sb.rpc('my_report_access', { rid: reportId })
  if (error) throw error
  return data as string
}

// ── Save (create / update) ────────────────────────────────────

export async function saveReport(
  orgId: string,
  form: ReportFormData,
  reportId?: string
): Promise<string> {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const payload = {
    org_id: orgId,
    author_id: user.id,
    title: form.title.trim() || '無題の報告書',
    site_name: form.site_name || null,
    location: form.location || null,
    worked_at: form.worked_at,
    weather: form.weather || null,
    temperature: form.temperature ? parseFloat(form.temperature) : null,
    summary: form.summary || null,
  }

  let id = reportId
  if (id) {
    const { error } = await sb.from('reports').update(payload).eq('id', id)
    if (error) throw error
    // 既存セクション削除（再作成）
    await sb.from('report_sections').delete().eq('report_id', id)
  } else {
    const { data, error } = await sb.from('reports').insert(payload).select('id').single()
    if (error) throw error
    id = data.id
  }

  // セクション
  for (let i = 0; i < form.sections.length; i++) {
    const sec = form.sections[i]
    const { data: sd, error: se } = await sb
      .from('report_sections')
      .insert({
        report_id: id,
        position: i,
        title: sec.title || null,
        mode: sec.mode,
        content: sec.mode === 'text' ? (sec.content || null) : null,
      })
      .select('id')
      .single()
    if (se) throw se

    if (sec.mode === 'checklist' && sec.items.length > 0) {
      await sb.from('checklist_items').insert(
        sec.items.map((it, j) => ({ section_id: sd.id, position: j, text: it.text, done: it.done }))
      )
    }

    for (let pi = 0; pi < sec.photos.length; pi++) {
      const path = await uploadPhoto(sec.photos[pi], id!)
      await sb.from('photos').insert({ report_id: id, section_id: sd.id, storage_path: path, position: pi })
    }
  }

  // ギャラリー写真
  for (let pi = 0; pi < form.gallery_photos.length; pi++) {
    const path = await uploadPhoto(form.gallery_photos[pi], id!)
    await sb.from('photos').insert({ report_id: id, section_id: null, storage_path: path, position: pi })
  }

  return id!
}

// ── Publish with permissions ───────────────────────────────────

export async function publishWithPermissions(reportId: string, permissions: PermissionEntry[]) {
  const sb = createClient()
  const perms = permissions.map(p => ({
    team_id: p.team_id ?? '',
    user_id: p.user_id ?? '',
    level: p.level,
  }))
  const { error } = await sb.rpc('publish_report_with_permissions', {
    p_report_id: reportId,
    p_permissions: perms,
  })
  if (error) throw error
}

// ── Unpublish ─────────────────────────────────────────────────

export async function unpublishReport(reportId: string) {
  const sb = createClient()
  const { error } = await sb.rpc('unpublish_report', { p_report_id: reportId })
  if (error) throw error
}

// ── Delete ────────────────────────────────────────────────────

export async function deleteReport(id: string) {
  const sb = createClient()
  const { error } = await sb.from('reports').delete().eq('id', id)
  if (error) throw error
}
