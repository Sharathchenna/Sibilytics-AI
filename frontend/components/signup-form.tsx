"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/browser"

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const supabase = useMemo(() => createClient(), [])
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const authRedirectTo = () =>
    `${window.location.origin}/auth/callback`

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus("idle")
    setMessage("")

    if (password !== confirmPassword) {
      setStatus("error")
      setMessage("Passwords do not match.")
      return
    }

    setIsSubmitting(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: authRedirectTo(),
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setStatus("error")
      setMessage(error.message)
      setIsSubmitting(false)
      return
    }

    setStatus("success")
    setMessage("Check your email to confirm your account.")
    setIsSubmitting(false)
  }

  const handleGoogleSignup = async () => {
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
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup}>
          <FieldGroup>
            {status !== "idle" && (
              <div
                className={[
                  "rounded-md border px-3 py-2 text-sm",
                  status === "success" &&
                    "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
                  status === "error" &&
                    "border-red-500/30 bg-red-500/10 text-red-200",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {message}
              </div>
            )}
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </Field>
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
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !fullName ||
                    !email ||
                    !password ||
                    !confirmPassword
                  }
                >
                  {isSubmitting ? "Creating..." : "Create Account"}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={isSubmitting}
                >
                  Sign up with Google
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account? <Link href="/login">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
