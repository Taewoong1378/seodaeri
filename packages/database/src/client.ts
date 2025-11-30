import { createClient } from '@supabase/supabase-js'
import type { Database } from './types.js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client (for client-side usage)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Create a browser client (alias for supabase)
export function createBrowserClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Server client with service role (for server-side operations that need elevated permissions)
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) {
    console.error('[createServiceClient] SUPABASE_SERVICE_ROLE_KEY is not set!')
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is missing')
  }

  if (!supabaseUrl) {
    console.error('[createServiceClient] NEXT_PUBLIC_SUPABASE_URL is not set!')
    throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is missing')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Server client for Next.js server components/actions
export function createServerClient(cookieStore?: {
  get: (name: string) => { value: string } | undefined
  set: (name: string, value: string, options?: object) => void
}) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
