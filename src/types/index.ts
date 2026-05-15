export type ReportPermissionLevel = 'viewer' | 'editor'
export type ReportStatus = 'draft' | 'published'
export type MyReportAccess = 'none' | 'viewer' | 'editor' | 'owner'

export interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
  // client-side
  is_admin?: boolean
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  is_admin: boolean
  joined_at: string
  profiles?: Profile
}

export interface OrgInvite {
  id: string
  org_id: string
  token: string
  is_admin: boolean
  expires_at: string
  used_count: number
  max_uses: number | null
  created_at: string
}

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
}

export interface Team {
  id: string
  org_id: string
  name: string
  created_by: string
  created_at: string
  // joined
  member_count?: number
  members?: TeamMemberWithProfile[]
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  added_at: string
}

export interface TeamMemberWithProfile extends TeamMember {
  profiles?: Profile
}

export interface Report {
  id: string
  org_id: string
  author_id: string
  status: ReportStatus
  title: string
  site_name: string | null
  location: string | null
  worked_at: string
  weather: string | null
  temperature: number | null
  summary: string | null
  created_at: string
  updated_at: string
  published_at: string | null
  // joined
  profiles?: Profile
  report_sections?: ReportSection[]
  photos?: Photo[]
  report_permissions?: ReportPermission[]
}

export interface ReportPermission {
  id: string
  report_id: string
  team_id: string | null
  user_id: string | null
  level: ReportPermissionLevel
  // joined
  teams?: Pick<Team, 'id' | 'name'>
  profiles?: Profile
}

export interface ReportSection {
  id: string
  report_id: string
  position: number
  title: string | null
  mode: 'text' | 'checklist'
  content: string | null
  checklist_items?: ChecklistItem[]
  photos?: Photo[]
}

export interface ChecklistItem {
  id: string
  section_id: string
  position: number
  text: string
  done: boolean
}

export interface Photo {
  id: string
  report_id: string
  section_id: string | null
  storage_path: string
  caption: string | null
  position: number
  created_at: string
  url?: string  // client-side only
}

// ── Form types ───────────────────────────────────────────────

export interface ReportFormData {
  title: string
  site_name: string
  location: string
  worked_at: string
  weather: string
  temperature: string
  summary: string
  sections: SectionFormData[]
  gallery_photos: File[]
}

export interface SectionFormData {
  id?: string
  title: string
  mode: 'text' | 'checklist'
  content: string
  items: ChecklistItemFormData[]
  photos: File[]
  existingPhotoIds?: string[]
}

export interface ChecklistItemFormData {
  id?: string
  text: string
  done: boolean
}

// 公開時パーミッション指定
export interface PermissionEntry {
  team_id?: string
  user_id?: string
  level: ReportPermissionLevel
  // display
  label?: string
}
