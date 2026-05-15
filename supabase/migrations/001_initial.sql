-- ============================================================
-- Field Report App — Schema v2
-- 組織 > チーム > ユーザー の階層と
-- 報告書ごとの細粒度権限(report_permissions)
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ── Enums ───────────────────────────────────────────────────
create type report_permission_level as enum ('viewer', 'editor');
create type report_status as enum ('draft', 'published');

-- ============================================================
-- TABLES
-- ============================================================

-- ── Organizations ────────────────────────────────────────────
-- 会社・事業所など最上位の組織単位
create table organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  slug        text unique not null,
  created_at  timestamptz not null default now()
);

-- ── Organization members ─────────────────────────────────────
-- is_admin: 組織管理者フラグ（アカウント発行・URL生成・チーム管理）
create table org_members (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  is_admin    boolean not null default false,
  joined_at   timestamptz not null default now(),
  unique (org_id, user_id)
);

-- ── Invite tokens (org-level) ────────────────────────────────
-- 管理者がURLを発行してメンバーに送る
create table org_invites (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  token       text unique not null default encode(gen_random_bytes(24), 'base64url'),
  is_admin    boolean not null default false,  -- 招待後のロール
  created_by  uuid not null references auth.users(id),
  expires_at  timestamptz not null default now() + interval '7 days',
  used_count  int not null default 0,
  max_uses    int,                             -- null = 無制限
  created_at  timestamptz not null default now()
);

-- ── Teams (組織内の細かいグループ) ──────────────────────────
create table teams (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

create index teams_org_idx on teams(org_id);

-- ── Team members ─────────────────────────────────────────────
create table team_members (
  id          uuid primary key default uuid_generate_v4(),
  team_id     uuid not null references teams(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  added_at    timestamptz not null default now(),
  unique (team_id, user_id)
);

create index team_members_team_idx on team_members(team_id);
create index team_members_user_idx on team_members(user_id);

-- ── Profiles ─────────────────────────────────────────────────
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  updated_at   timestamptz not null default now()
);

-- ── Reports ──────────────────────────────────────────────────
create table reports (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references organizations(id) on delete cascade,
  author_id     uuid not null references auth.users(id),
  status        report_status not null default 'draft',

  title         text not null,
  site_name     text,
  location      text,
  worked_at     date not null default current_date,
  weather       text,
  temperature   numeric(4,1),
  summary       text,

  search_vector tsvector,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz
);

create index reports_search_idx    on reports using gin(search_vector);
create index reports_org_idx       on reports(org_id, status);
create index reports_author_idx    on reports(author_id);

-- ── Report permissions ───────────────────────────────────────
-- 公開時に「誰が/どのチームが」「何権限で」アクセスできるか
-- team_id と user_id はどちらか一方のみセット（どちらもnullはNG）
-- 未指定のユーザー → RLSで viewer 相当として扱う
create table report_permissions (
  id          uuid primary key default uuid_generate_v4(),
  report_id   uuid not null references reports(id) on delete cascade,
  team_id     uuid references teams(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  level       report_permission_level not null default 'viewer',
  created_at  timestamptz not null default now(),
  -- どちらか必ずセット
  constraint one_of_team_or_user check (
    (team_id is not null and user_id is null) or
    (team_id is null and user_id is not null)
  )
);

create index rp_report_idx on report_permissions(report_id);
create index rp_team_idx   on report_permissions(team_id);
create index rp_user_idx   on report_permissions(user_id);

-- ── Report sections ──────────────────────────────────────────
create table report_sections (
  id          uuid primary key default uuid_generate_v4(),
  report_id   uuid not null references reports(id) on delete cascade,
  position    int not null default 0,
  title       text,
  mode        text not null default 'text' check (mode in ('text','checklist')),
  content     text,
  created_at  timestamptz not null default now()
);

create index report_sections_idx on report_sections(report_id, position);

-- ── Checklist items ──────────────────────────────────────────
create table checklist_items (
  id          uuid primary key default uuid_generate_v4(),
  section_id  uuid not null references report_sections(id) on delete cascade,
  position    int not null default 0,
  text        text not null,
  done        boolean not null default false
);

-- ── Photos ───────────────────────────────────────────────────
-- section_id = null → ギャラリー写真（報告書全体のエビデンス）
create table photos (
  id           uuid primary key default uuid_generate_v4(),
  report_id    uuid not null references reports(id) on delete cascade,
  section_id   uuid references report_sections(id) on delete set null,
  storage_path text not null,
  caption      text,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

create index photos_report_idx  on photos(report_id);
create index photos_section_idx on photos(section_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- touch updated_at
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger reports_updated_at
  before update on reports
  for each row execute function touch_updated_at();

-- 全文検索ベクター更新
create or replace function update_report_search()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.site_name, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.location, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.summary, '')), 'C');
  return new;
end;
$$;

create trigger reports_search_vector
  before insert or update on reports
  for each row execute function update_report_search();

-- サインアップ時にプロフィール自動作成
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 招待トークン使用（ログイン済みユーザーが呼ぶ）
create or replace function use_org_invite(token_value text)
returns jsonb language plpgsql security definer as $$
declare
  inv org_invites%rowtype;
begin
  select * into inv from org_invites
  where token = token_value
    and expires_at > now()
    and (max_uses is null or used_count < max_uses);

  if not found then
    return jsonb_build_object('error', 'Invalid or expired invite');
  end if;

  insert into org_members (org_id, user_id, is_admin)
  values (inv.org_id, auth.uid(), inv.is_admin)
  on conflict (org_id, user_id) do nothing;

  update org_invites set used_count = used_count + 1 where id = inv.id;

  return jsonb_build_object('ok', true, 'org_id', inv.org_id);
end;
$$;

-- 報告書公開（パーミッションを一括セット）
-- permissions_json: [{"team_id":"...","level":"editor"}, {"user_id":"...","level":"viewer"}, ...]
create or replace function publish_report_with_permissions(
  p_report_id uuid,
  p_permissions jsonb
)
returns void language plpgsql security definer as $$
declare
  perm jsonb;
begin
  -- 作者のみ実行可能
  if not exists (
    select 1 from reports where id = p_report_id and author_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  -- 既存パーミッションを削除して再設定
  delete from report_permissions where report_id = p_report_id;

  for perm in select * from jsonb_array_elements(p_permissions)
  loop
    insert into report_permissions (report_id, team_id, user_id, level)
    values (
      p_report_id,
      nullif(perm->>'team_id', '')::uuid,
      nullif(perm->>'user_id', '')::uuid,
      (perm->>'level')::report_permission_level
    );
  end loop;

  update reports
  set status = 'published', published_at = coalesce(published_at, now())
  where id = p_report_id;
end;
$$;

-- 報告書を下書きに戻す
create or replace function unpublish_report(p_report_id uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (
    select 1 from reports r
    join org_members m on m.org_id = r.org_id
    where r.id = p_report_id
      and m.user_id = auth.uid()
      and (r.author_id = auth.uid() or m.is_admin)
  ) then
    raise exception 'Not authorized';
  end if;

  update reports set status = 'draft' where id = p_report_id;
  delete from report_permissions where report_id = p_report_id;
end;
$$;

-- ============================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================

-- 組織メンバーか
create or replace function is_org_member(oid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from org_members where org_id = oid and user_id = auth.uid());
$$;

-- 組織adminか
create or replace function is_org_admin(oid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from org_members where org_id = oid and user_id = auth.uid() and is_admin);
$$;

-- 報告書の実効権限を返す（'none'/'viewer'/'editor'/'owner'）
create or replace function my_report_access(rid uuid)
returns text language sql security definer stable as $$
  select
    case
      when exists (select 1 from reports where id = rid and author_id = auth.uid()) then 'owner'
      when exists (
        select 1 from report_permissions rp
        left join team_members tm on tm.team_id = rp.team_id and tm.user_id = auth.uid()
        where rp.report_id = rid
          and rp.level = 'editor'
          and (rp.user_id = auth.uid() or tm.user_id is not null)
      ) then 'editor'
      when exists (
        select 1 from reports r
        join org_members m on m.org_id = r.org_id and m.user_id = auth.uid() and m.is_admin
        where r.id = rid
      ) then 'editor'  -- org admin は全報告書を編集可
      when exists (
        -- 公開済みかつ同組織メンバー → 最低でもviewer
        select 1 from reports r
        join org_members m on m.org_id = r.org_id and m.user_id = auth.uid()
        where r.id = rid and r.status = 'published'
      ) then 'viewer'
      else 'none'
    end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table organizations      enable row level security;
alter table org_members        enable row level security;
alter table org_invites        enable row level security;
alter table profiles           enable row level security;
alter table teams              enable row level security;
alter table team_members       enable row level security;
alter table reports            enable row level security;
alter table report_permissions enable row level security;
alter table report_sections    enable row level security;
alter table checklist_items    enable row level security;
alter table photos             enable row level security;

-- organizations
create policy "org: members can view"
  on organizations for select using (is_org_member(id));
create policy "org: admins can update"
  on organizations for update using (is_org_admin(id));

-- org_members
create policy "org_members: members can view"
  on org_members for select using (is_org_member(org_id));
create policy "org_members: admins can insert"
  on org_members for insert with check (is_org_admin(org_id));
create policy "org_members: admins can update"
  on org_members for update using (is_org_admin(org_id));
create policy "org_members: admins can delete or self-leave"
  on org_members for delete using (is_org_admin(org_id) or user_id = auth.uid());

-- org_invites
create policy "org_invites: admins can manage"
  on org_invites for all using (is_org_admin(org_id));
create policy "org_invites: anyone can read token"
  on org_invites for select using (true);

-- profiles
create policy "profiles: view if same org"
  on profiles for select using (
    id = auth.uid() or exists (
      select 1 from org_members m1
      join org_members m2 on m1.org_id = m2.org_id
      where m1.user_id = auth.uid() and m2.user_id = profiles.id
    )
  );
create policy "profiles: update own"
  on profiles for update using (id = auth.uid());

-- teams
create policy "teams: org members can view"
  on teams for select using (is_org_member(org_id));
create policy "teams: org admins can insert"
  on teams for insert with check (is_org_admin(org_id));
create policy "teams: org admins can update/delete"
  on teams for update using (is_org_admin(org_id));
create policy "teams: org admins can delete"
  on teams for delete using (is_org_admin(org_id));

-- team_members
create policy "team_members: org members can view"
  on team_members for select using (
    exists (select 1 from teams t where t.id = team_id and is_org_member(t.org_id))
  );
create policy "team_members: org admins can manage"
  on team_members for all using (
    exists (select 1 from teams t where t.id = team_id and is_org_admin(t.org_id))
  );

-- reports
create policy "reports: author or org admin can view draft; published visible to org"
  on reports for select using (
    author_id = auth.uid()
    or is_org_admin(org_id)
    or (status = 'published' and is_org_member(org_id))
  );
create policy "reports: org members can create"
  on reports for insert with check (
    is_org_member(org_id) and author_id = auth.uid()
  );
create policy "reports: author or org admin can update"
  on reports for update using (
    author_id = auth.uid() or is_org_admin(org_id)
  );
create policy "reports: author (draft only) or org admin can delete"
  on reports for delete using (
    (author_id = auth.uid() and status = 'draft') or is_org_admin(org_id)
  );

-- report_permissions
create policy "report_permissions: visible to org members of report's org"
  on report_permissions for select using (
    exists (
      select 1 from reports r where r.id = report_id and is_org_member(r.org_id)
    )
  );
-- insert/update/delete は publish_report_with_permissions() security definer で行う

-- report_sections
create policy "report_sections: select"
  on report_sections for select using (my_report_access(report_id) != 'none');
create policy "report_sections: modify if editor/owner"
  on report_sections for all using (my_report_access(report_id) in ('editor','owner'));

-- checklist_items
create policy "checklist_items: select"
  on checklist_items for select using (
    exists (select 1 from report_sections s where s.id = section_id and my_report_access(s.report_id) != 'none')
  );
create policy "checklist_items: modify"
  on checklist_items for all using (
    exists (select 1 from report_sections s where s.id = section_id and my_report_access(s.report_id) in ('editor','owner'))
  );

-- photos
create policy "photos: select"
  on photos for select using (my_report_access(report_id) != 'none');
create policy "photos: modify"
  on photos for all using (my_report_access(report_id) in ('editor','owner'));

-- ============================================================
-- STORAGE BUCKET POLICIES
-- （Supabase ダッシュボード Storage > report-photos で設定）
-- ============================================================
-- insert: authenticated
-- select: authenticated
-- delete: own objects only (owner = auth.uid()::text)
