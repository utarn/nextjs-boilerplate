'use client'

import { useTranslations } from 'next-intl'
import { Menu, Home, CheckSquare, User, Settings, LogOut, LayoutDashboard } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { ThemePickerDropdown } from '@/components/layout/ThemePickerDropdown'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface AppLayoutProps {
  children: React.ReactNode
  user: {
    email: string
    displayName: string
    role: string
  }
}

export function AppLayout({ children, user }: AppLayoutProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const navItems = [
    { href: '/dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/todos', label: t('todos'), icon: CheckSquare },
    { href: '/profile', label: t('profile'), icon: User },
    { href: '/settings', label: t('settings'), icon: Settings },
  ]

  // Admin-only link
  if (user.role === 'ADMIN') {
    navItems.push({ href: '/admin/queues', label: t('admin'), icon: LayoutDashboard })
  }

  const isActive = (href: string) => pathname?.startsWith(href)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full w-64 flex-col fixed inset-y-0 z-50 border-r">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold">Next.js Boilerplate</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent ${
                isActive(item.href) ? 'bg-accent text-accent-foreground' : ''
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t space-y-1">
          <p className="text-xs text-muted-foreground px-3 truncate">{user.email}</p>
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-5 w-5 mr-3" />
            {t('logout')}
          </Button>
        </div>
      </div>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b bg-background z-50 flex items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="flex flex-col gap-2 mt-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent ${
                    isActive(item.href) ? 'bg-accent' : ''
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
              <Button variant="ghost" className="justify-start mt-4" onClick={handleLogout}>
                <LogOut className="h-5 w-5 mr-3" />
                {t('logout')}
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
        <h1 className="text-lg font-bold ml-4">Next.js Boilerplate</h1>
      </div>

      {/* Top bar */}
      <div className="fixed top-0 right-0 md:left-64 h-14 border-b bg-background z-40 flex items-center justify-end px-4 gap-2">
        <ThemePickerDropdown />
        <LanguageToggle />
      </div>

      {/* Main content */}
      <main className="md:ml-64 pt-14 md:pt-14 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
