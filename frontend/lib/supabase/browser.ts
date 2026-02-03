import { createBrowserClient } from "@supabase/ssr"

const getSupabaseConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)."
    )
  }

  return { url, key }
}

export const createClient = () => {
  const { url, key } = getSupabaseConfig()
  return createBrowserClient(url, key)
}
