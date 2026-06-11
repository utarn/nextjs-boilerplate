"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { X, CircleAlert } from "lucide-react"

// ---------------------------------------------------------------------------
// Error param → i18n key mapping (for URL query params from OAuth callback)
// ---------------------------------------------------------------------------

const ERROR_I18N_KEYS: Record<string, string> = {
  domain_not_allowed: "errorDomainNotAllowed",
  missing_token: "errorSendFailed",
  invalid_token: "errorSendFailed",
  token_used: "errorSendFailed",
  token_expired: "errorSendFailed",
  account_disabled: "errorSendFailed",
  verification_failed: "errorSendFailed",
}

function resolveError(errorKey: string, t: (key: string) => string): string {
  const i18nKey = ERROR_I18N_KEYS[errorKey]
  if (i18nKey) {
    return t(i18nKey)
  }
  return t("errorSendFailed")
}

// ---------------------------------------------------------------------------
// Grid shape SVG
// ---------------------------------------------------------------------------

function GridShapeTop() {
  return (
    <div className="absolute right-0 top-0 -z-1 w-full max-w-[250px] xl:max-w-[450px]">
      <svg
        width="450"
        height="254"
        viewBox="0 0 450 254"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0.50555 45.1131L450 45.1132L450 44.6073L0.50555 44.6072L0.50555 45.1131Z"
          fill="url(#grid-paint-0)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M205.546 253.529L205.546 -2.13709e-05L205.04 -2.1392e-05L205.04 253.529L205.546 253.529Z"
          fill="url(#grid-paint-1)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0.505546 97.2164L450 97.2165L450 96.7106L0.505546 96.7106L0.505546 97.2164Z"
          fill="url(#grid-paint-2)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M256.806 253.529L256.806 -1.68895e-05L256.3 -1.69106e-05L256.3 253.529L256.806 253.529Z"
          fill="url(#grid-paint-3)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0.505837 253.529L0.505859 -3.9296e-05L0 -3.93171e-05L-2.21642e-05 253.529L0.505837 253.529Z"
          fill="url(#grid-paint-4)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0.505541 149.321L450 149.321L450 148.815L0.505541 148.815L0.505541 149.321Z"
          fill="url(#grid-paint-5)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M308.066 253.529L308.066 -1.24083e-05L307.56 -1.24294e-05L307.56 253.529L308.066 253.529Z"
          fill="url(#grid-paint-6)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M51.7662 253.529L51.7662 -3.48147e-05L51.2603 -3.48358e-05L51.2603 253.529L51.7662 253.529Z"
          fill="url(#grid-paint-7)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0.505537 201.424L450 201.424L450 200.918L0.505537 200.918L0.505537 201.424Z"
          fill="url(#grid-paint-8)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M359.326 253.529L359.326 -7.92695e-06L358.82 -7.94806e-06L358.82 253.529L359.326 253.529Z"
          fill="url(#grid-paint-9)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M103.026 253.529L103.026 -3.03334e-05L102.52 -3.03545e-05L102.52 253.529L103.026 253.529Z"
          fill="url(#grid-paint-10)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M410.586 253.529L410.586 -3.44569e-06L410.08 -3.4668e-06L410.08 253.529L410.586 253.529Z"
          fill="url(#grid-paint-11)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M154.286 253.529L154.286 -2.58521e-05L153.78 -2.58732e-05L153.78 253.529L154.286 253.529Z"
          fill="url(#grid-paint-12)"
          fillOpacity="0.3"
        />
        <rect
          width="50.7536"
          height="51.5982"
          transform="matrix(-1 -8.74228e-08 -8.74228e-08 1 358.821 45.1138)"
          fill="#B2B2B2"
          fillOpacity="0.08"
        />
        <rect
          width="50.756"
          height="51.5985"
          transform="matrix(-1 -8.74228e-08 -8.74228e-08 1 307.559 97.2163)"
          fill="#B2B2B2"
          fillOpacity="0.08"
        />
        <defs>
          {Array.from({ length: 13 }, (_, i) => (
            <linearGradient
              key={i}
              id={`grid-paint-${i}`}
              x1="277.872"
              y1="-9.94587e-06"
              x2="194.87"
              y2="235.867"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#B2B2B2" />
              <stop offset="1" stopColor="#B2B2B2" stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
      </svg>
    </div>
  )
}

function GridShapeBottom() {
  return (
    <div className="absolute bottom-0 left-0 -z-1 w-full max-w-[250px] rotate-180 xl:max-w-[450px]">
      <svg
        width="450"
        height="254"
        viewBox="0 0 450 254"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0.50555 45.1131L450 45.1132L450 44.6073L0.50555 44.6072L0.50555 45.1131Z"
          fill="url(#grid-paint-b0)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M205.546 253.529L205.546 -2.13709e-05L205.04 -2.1392e-05L205.04 253.529L205.546 253.529Z"
          fill="url(#grid-paint-b1)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0.505546 97.2164L450 97.2165L450 96.7106L0.505546 96.7106L0.505546 97.2164Z"
          fill="url(#grid-paint-b2)"
          fillOpacity="0.3"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M256.806 253.529L256.806 -1.68895e-05L256.3 -1.69106e-05L256.3 253.529L256.806 253.529Z"
          fill="url(#grid-paint-b3)"
          fillOpacity="0.3"
        />
        <rect
          width="50.7536"
          height="51.5982"
          transform="matrix(-1 -8.74228e-08 -8.74228e-08 1 358.821 45.1138)"
          fill="#B2B2B2"
          fillOpacity="0.08"
        />
        <defs>
          {Array.from({ length: 4 }, (_, i) => (
            <linearGradient
              key={i}
              id={`grid-paint-b${i}`}
              x1="277.872"
              y1="-9.94587e-06"
              x2="194.87"
              y2="235.867"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#B2B2B2" />
              <stop offset="1" stopColor="#B2B2B2" stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LoginClientProps {
  googleClientId: string | null
}

export function LoginClient({ googleClientId }: LoginClientProps) {
  const t = useTranslations("Login")
  const searchParams = useSearchParams()
  const errorParam = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(
    errorParam ? resolveError(errorParam, t) : null,
  )

  function dismissError() {
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError(t("errorEmailRequired"))
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t("errorSendFailed"))
        return
      }

      setSent(true)
    } catch {
      setError(t("errorNetwork"))
    } finally {
      setLoading(false)
    }
  }

  // Brand info
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Next.js Boilerplate"

  return (
    <div className="relative flex flex-col justify-center w-full h-screen bg-white dark:bg-gray-900 lg:flex-row">
      {/* ================================================================== */}
      {/* LEFT PANEL — Form content                                           */}
      {/* ================================================================== */}
      <div className="flex flex-col flex-1 w-full lg:w-1/2">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6">
          {/* Heading */}
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-2xl dark:text-white/90 sm:text-3xl">
              {t("title")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("description")}
            </p>
          </div>

          {/* Error alert */}
          {error && (
            <Alert variant="destructive" className="mb-4 pr-10 relative">
              <CircleAlert className="size-4" />
              <AlertDescription>{error}</AlertDescription>
              <button
                type="button"
                onClick={dismissError}
                className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label={t("dismiss")}
              >
                <X className="size-4" />
              </button>
            </Alert>
          )}

          {/* Sent state */}
          {sent ? (
            <div className="text-center space-y-3">
              <div className="text-2xl">&#9993;</div>
              <h2 className="text-lg font-semibold">{t("checkEmail")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("sentTo", { email })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("resendHint")}
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSent(false)
                  setEmail("")
                }}
              >
                {t("tryAgain")}
              </Button>
            </div>
          ) : (
            <>
              {/* Google SSO button */}
              {googleClientId && (
                <>
                  <a href="/api/auth/google" className="block">
                    <Button
                      variant="outline"
                      className="w-full py-3 text-sm font-normal text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-800 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
                      type="button"
                    >
                      <svg className="mr-2 size-5" viewBox="0 0 20 20" fill="none">
                        <path
                          d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9087 16.6126L16.0924 16.6305C17.7788 15.1041 18.7511 12.8583 18.7511 10.1944Z"
                          fill="#4285F4"
                        />
                        <path
                          d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99473 11.7392L2.23868 13.8295L2.20264 13.9277C3.67087 16.786 6.68674 18.75 10.1788 18.75Z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6027 4.80257 9.99992C4.80257 9.3971 4.91165 8.81379 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20333 6.0721C1.5982 7.25823 1.25098 8.5902 1.25098 9.99992C1.25098 11.4096 1.5982 12.7415 2.20333 13.9277L5.10014 11.7305Z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M10.1789 4.63331C11.8554 4.63331 12.9864 5.34303 13.6312 5.93612L16.1511 3.525C14.6035 2.11528 12.5895 1.25 10.1789 1.25C6.68676 1.25 3.67088 3.21387 2.20264 6.07218L5.08953 8.26943C5.81381 6.15972 7.81776 4.63331 10.1789 4.63331Z"
                          fill="#EB4335"
                        />
                      </svg>
                      {t("signInWithGoogle")}
                    </Button>
                  </a>

                  {/* Divider */}
                  <div className="relative py-3 sm:py-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200 dark:border-gray-800" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="p-2 text-gray-400 bg-white sm:px-5 sm:py-2 dark:bg-gray-900">
                        {t("orContinueWithEmail")}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Magic link form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
                  >
                    {t("emailLabel")}
                    <span className="text-destructive">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-ring"
                    required
                  />
                </div>
                <div>
                  <Button
                    type="submit"
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-primary hover:bg-primary/90"
                    disabled={loading}
                  >
                    {loading ? t("sending") : t("sendMagicLink")}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* RIGHT PANEL — Decorative (hidden on mobile)                        */}
      {/* ================================================================== */}
      <div className="relative items-center hidden w-full h-full bg-gray-900 dark:bg-white/5 lg:grid lg:w-1/2">
        <div className="flex items-center justify-center z-10">
          <GridShapeTop />
          <GridShapeBottom />

          <div className="flex flex-col items-center max-w-xs">
            <div className="mb-4">
              <img
                src="/logo.png"
                alt={appName}
                width="256"
                height="256"
                className="rounded-xl"
              />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-white">{appName}</h2>
            <p className="text-center text-sm text-gray-400 dark:text-white/60">
              {t("brandTagline")}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
