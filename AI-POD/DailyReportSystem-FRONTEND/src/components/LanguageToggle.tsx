'use client';

import { IconButton, Tooltip } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  persistLocale,
  replaceLocaleInPath,
  resolveLocale,
  setLocaleCookie,
  setLocalOverrideLocale,
} from '@/utils/localePreference';

export default function LanguageToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const activeLocale = resolveLocale(locale);
  const nextLocale = activeLocale === 'en' ? 'ja' : 'en';

  const switchLocale = () => {
    setLocalOverrideLocale(nextLocale);
    persistLocale(nextLocale);
    setLocaleCookie(nextLocale);
    router.push(replaceLocaleInPath(pathname, nextLocale));
  };

  return (
    <Tooltip title={`Language: ${locale === 'en' ? 'English' : '日本語'}`}>
      <IconButton onClick={switchLocale} color="inherit">
        <LanguageIcon />
      </IconButton>
    </Tooltip>
  );
}
