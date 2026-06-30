'use client';

// Language toggle component for switching between EN and JA
import { FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import {
  AppLocale,
  SUPPORTED_LOCALES,
  persistLocale,
  replaceLocaleInPath,
  resolveLocale,
  setLocaleCookie,
  setLocalOverrideLocale,
} from '@/utils/localePreference';

const localeLabels: Record<AppLocale, string> = {
  en: 'English',
  ja: '日本語',
};

export default function LanguageToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const activeLocale = resolveLocale(locale);

  const switchLocale = async (event: SelectChangeEvent<AppLocale>) => {
    const selectedLocale = event.target.value as AppLocale;
    setLocalOverrideLocale(selectedLocale);
    persistLocale(selectedLocale);
    setLocaleCookie(selectedLocale);
    router.push(replaceLocaleInPath(pathname ?? '/', selectedLocale));
  };

  return (
    <FormControl variant="standard" size="small" sx={{ minWidth: 96 }}>
      <Select
        value={activeLocale}
        onChange={switchLocale}
        displayEmpty
        inputProps={{ 'aria-label': 'Select language' }}
        sx={{
          color: 'inherit',
          '.MuiSvgIcon-root': { color: 'inherit' },
          '& .MuiSelect-select': {
            paddingY: 0.5,
            paddingX: 1.5,
          },
        }}
      >
        {SUPPORTED_LOCALES.map((localeCode) => (
          <MenuItem key={localeCode} value={localeCode}>
            {localeLabels[localeCode]}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}