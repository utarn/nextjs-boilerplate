'use client'

import { useLocale } from 'next-intl'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePathname, useRouter } from 'next/navigation'

export function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`

    // Remove current locale from path
    const pathWithoutLocale = pathname.replace(/^\/[^/]+/, '')
    router.push(`/${newLocale}${pathWithoutLocale || '/'}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Globe className="h-5 w-5" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => switchLocale('en')}
          className={locale === 'en' ? 'bg-accent' : ''}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchLocale('th')}
          className={locale === 'th' ? 'bg-accent' : ''}
        >
          ไทย
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
