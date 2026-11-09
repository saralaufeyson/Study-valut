import { createClient } from '@supabase/supabase-js'
import { readSupabaseConfig } from './supabase-config'
import type { Database } from './database.types'

// Vite reads .env automatically. Only public browser configuration belongs here.
const config = readSupabaseConfig({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
})

// ES modules share this single client across the app's imports.
export const supabase = config
  ? createClient<Database>(config.url, config.key, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
