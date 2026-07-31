import { createClient } from '@supabase/supabase-js'

// Publishable keys are designed to ship in the client bundle. Every table is
// protected by row-level security keyed on auth.uid(), so this key alone grants
// nothing without a valid session.
const SUPABASE_URL = 'https://lhobanahrkcyrsotgriu.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_GF_4Nszm4tBb4ZLzP7zD_w_Ko3YI_Wx'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'levelup-auth',
  },
})
