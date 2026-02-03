import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

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

export const createClient = async () => {
  const { url, key } = getSupabaseConfig()
  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name, options) {
        cookieStore.delete({ name, ...options })
      },
    },
  })
}
