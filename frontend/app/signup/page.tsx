import Image from "next/image"

import { SignupForm } from "@/components/signup-form"

export default function Page() {
  return (
    <div className="min-h-svh w-full p-6 md:p-10">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6">
          <Image
            src="/dop-logo.svg"
            alt="DOP logo"
            width={320}
            height={215}
            className="h-auto w-56 md:w-64 object-contain"
            priority
          />
          <SignupForm className="w-full" />
        </div>
      </div>
    </div>
  )
}
