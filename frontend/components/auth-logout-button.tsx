"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/browser"

export function AuthLogoutButton() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
    setIsLoggingOut(false)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      <LogOut className="size-4" aria-hidden="true" />
      {isLoggingOut ? "Logging out..." : "Logout"}
    </Button>
  )
}
