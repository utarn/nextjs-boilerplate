import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

const SUPPORTED_LOCALES = ['th', 'en'] as const;
const DEFAULT_LOCALE = 'en';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;

  const locale =
    localeCookie && SUPPORTED_LOCALES.includes(localeCookie as typeof SUPPORTED_LOCALES[number])
      ? localeCookie
      : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
