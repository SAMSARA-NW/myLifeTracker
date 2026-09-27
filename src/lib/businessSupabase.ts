import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_BUSINESS_SUPABASE_URL as string
const key = import.meta.env.VITE_BUSINESS_SUPABASE_KEY as string

// A public API key identifies the project; the owner's session authorizes data access.
export const businessSupabase = createClient(url, key, {
  auth: { storageKey: 'mylifetracker-business-auth', detectSessionInUrl: false },
})
