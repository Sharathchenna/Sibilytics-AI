"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/browser"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const authRedirectTo = () =>
    `${window.location.origin}/auth/callback`

  const handleMagicLink = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setStatus("idle")
    setMessage("")

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: authRedirectTo(),
        shouldCreateUser: false,
      },
    })

    if (error) {
      setStatus("error")
      setMessage(error.message)
      setIsSubmitting(false)
      return
    }

    setStatus("success")
    setMessage("Check your email for a magic link to sign in.")
    setIsSubmitting(false)
  }

  const handleGoogleLogin = async () => {
    setIsSubmitting(true)
    setStatus("idle")
    setMessage("")

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authRedirectTo(),
      },
    })

    if (error) {
      setStatus("error")
      setMessage(error.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleMagicLink}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl font-bold">Welcome to Sibilytics AI</h1>
            <FieldDescription>
              Don&apos;t have an account? <Link href="/signup">Sign up</Link>
            </FieldDescription>
          </div>
          {status !== "idle" && (
            <div
              className={cn(
                "rounded-md border px-3 py-2 text-sm",
                status === "success" &&
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
                status === "error" &&
                  "border-red-500/30 bg-red-500/10 text-red-200"
              )}
            >
              {message}
            </div>
          )}
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field>
            <Button type="submit" disabled={isSubmitting || !email}>
              {isSubmitting ? "Sending..." : "Send Magic Link"}
            </Button>
          </Field>
          <FieldSeparator>Or</FieldSeparator>
          <Field>
            <Button
              variant="outline"
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
              Continue with Google
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
