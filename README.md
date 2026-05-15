# 現場作業報告書 v2

## セットアップ

### 1. Supabase

1. [supabase.com](https://supabase.com) でプロジェクト作成
2. SQL Editor で `supabase/migrations/001_initial.sql` を実行
3. Storage で `report-photos` バケットを作成（Public: **OFF**）
4. Storage バケットのポリシーを設定：
   - INSERT: `authenticated`
   - SELECT: `authenticated`
   - DELETE: `(bucket_id = 'report-photos') AND (owner = auth.uid()::text)`

### 2. 環境変数

```bash
cp .env.local.example .env.local
# NEXT_PUBLIC_SUPABASE_URL と ANON_KEY を記入
```

### 3. 起動

```bash
npm install
npm run dev
# 本番: npm run build && npm start
```

---

## 権限モデル

```
organizations (組織)
  └─ org_members (メンバー + is_admin フラグ)
  └─ teams (チーム / 部署)
       └─ team_members
  └─ reports (報告書)
       └─ report_permissions (公開時に設定)
            ├─ team_id + level  … チーム単位で viewer/editor
            └─ user_id + level  … ユーザー個別で viewer/editor
```

### アクセス制御ルール

| 条件 | アクセス |
|---|---|
| 作成者本人 | owner（全操作） |
| org admin | editor（全報告書を編集・削除可） |
| report_permissions に editor で含まれる | 編集可 |
| report_permissions に viewer で含まれる | 閲覧のみ |
| 公開済みの同組織メンバー（指定なし） | viewer 相当（閲覧のみ） |
| 下書き＋author以外 | アクセス不可 |

### 公開フロー

1. 作成者が「公開する」ボタンを押す
2. モーダルでチーム or ユーザーを選択し、editor/viewer を指定
3. 確定すると `publish_report_with_permissions()` RPC を呼び出し：
   - `report_permissions` を一括更新
   - `reports.status = 'published'` に変更

### 組織管理（管理者のみ）

- 招待URL発行（7日間有効）→ URLをメンバーに送る → `/register?invite=TOKEN` でアカウント作成
- チーム作成・メンバー追加・削除
- メンバーのadmin昇格・降格

---

## PWA

`npm run build` でService Workerが生成されます。

- 写真（Supabase Storage）は30日間キャッシュ
- API は NetworkFirst（オフライン時は直近キャッシュ）

`public/icon-192.png` と `public/icon-512.png` を用意してください。
