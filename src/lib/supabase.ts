import { createBrowserClient } from '@supabase/ssr'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!_client) _client = createBrowserClient(url, anon)
  return _client
}
