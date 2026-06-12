'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemePickerDropdown } from '@/components/layout/ThemePickerDropdown'
import { LanguageToggle } from '@/components/layout/LanguageToggle'

export default function SettingsPage() {
  const t = useTranslations('nav')
  const ts = useTranslations('settings')

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">{t('settings')}</h1>
      <div className="space-y-4 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{ts('theme')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ThemePickerDropdown />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{ts('language')}</CardTitle>
          </CardHeader>
          <CardContent>
            <LanguageToggle />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
