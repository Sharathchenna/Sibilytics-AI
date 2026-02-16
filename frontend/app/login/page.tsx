import Image from "next/image"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="bg-background min-h-svh p-6 md:p-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6">
          <Image
            src="/dop-logo.svg"
            alt="DOP logo"
            width={320}
            height={215}
            className="h-auto w-56 md:w-64 object-contain"
            priority
          />
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
