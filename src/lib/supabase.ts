import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configured = Boolean(url && key)

export const supabase: SupabaseClient = createClient(
  url || 'http://localhost:54321',
  key || 'missing-anon-key',
  // PKCE puts the magic-link code in ?code=, which keeps the #/route hash free for the router.
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } },
)
