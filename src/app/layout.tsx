import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { ThemeScript } from '@/components/providers/ThemeScript'
import './globals.css'
import './themes.css'

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Next.js Boilerplate'

export const metadata: Metadata = {
  title: appName,
  description: 'Production-ready Next.js boilerplate template',
  icons: {
    icon: '/new_logo.png',
    apple: '/new_logo.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
