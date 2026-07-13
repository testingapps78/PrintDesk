import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://umoazkqjboywukhdxnmv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtb2F6a3FqYm95d3VraGR4bm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNTgxNjYsImV4cCI6MjA5NzYzNDE2Nn0.gsanpoZe8mQ08FPMuwLkigYipTVmEdiEoStoHQlUDrI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
})

export function loginIdentifierToEmail(identifier) {
  return `${identifier.trim().toLowerCase()}@area9219.local`
}

// Call the admin Edge Function
export async function callAdminFn(action, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-user-management`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  })
  const data = await res.json()
  if (!res.ok || data.error) throw new Error(data.error || 'Edge function error')
  return data
}
