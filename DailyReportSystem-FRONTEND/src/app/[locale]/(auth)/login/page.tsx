'use client';

import {
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { loginApi } from '@/app/[locale]/(auth)/index';
import { useAuth } from '@/app/_contexts/AuthContext'
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/app/_providers/ToastProvider';
import {
  resolveLocale,
} from '@/utils/localePreference';

export default function Login() {
  const t = useTranslations('login');
  const router = useRouter()
  const { login } = useAuth()
  const showToast = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setLoading] = useState(false);

  const [email, setEmail] = useState('')
  const pathname = usePathname();
  const [password, setPassword] = useState('')
  const currentLocale = resolveLocale(pathname.split('/')[1] ?? null);

  const [errors, setErrors] = useState({
    email: '',
    password: ''
  })

  const [touched, setTouched] = useState({
    email: false,
    password: false
  })

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      return t('form.validations.email.required');
    }

    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
      return t('form.validations.email.invalid');
    }

    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) {
      return t('form.validations.password.required');
    }

    if (value.length < 6) {
      return t('form.validations.password.minLength');
    }
    return '';
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setTouched((prev) => ({ ...prev, email: true }));
    setErrors((prev) => ({ ...prev, email: validateEmail(newEmail) }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setTouched((prev) => ({ ...prev, password: true }));
    setErrors((prev) => ({ ...prev, password: validatePassword(newPassword) }));
  };

  const resolveLoginErrorMessage = (error: unknown) => {
    const normalizedError = error as Error & {
      statusCode?: number;
      errorCode?: string | null;
      responseBody?: { detail?: string; error?: string; message?: string } | null;
    };

    const detail = normalizedError.responseBody?.detail?.toLowerCase() ?? '';
    const message = (normalizedError.message || '').toLowerCase();
    const code = (normalizedError.errorCode || '').toLowerCase();

    if (detail.includes('not been invited to an organization') || message.includes('not been invited to an organization')) {
      return t('toast.error.notInvited');
    }

    if (code === 'no_org_membership' || detail.includes('membership') || detail.includes('organization') || detail.includes('organisation') || detail.includes('invite') || message.includes('membership') || message.includes('organization') || message.includes('organisation') || message.includes('invite')) {
      return t('toast.error.notInvited');
    }

    if (normalizedError.statusCode === 401 || normalizedError.statusCode === 403) {
      return t('toast.error.invalidCredentials');
    }

    if ((normalizedError.statusCode ?? 0) >= 500) {
      return t('toast.error.serverError');
    }

    return t('toast.error.defaultMessage');
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    
    setErrors({ email: emailError, password: passwordError });
    
    if (emailError || passwordError) {
      return;
    }
    
    setLoading(true);

    try {

      const data = await loginApi({
        email: email,
        password: password
      })

      if (data) {
        const { tokens, user_id, email, organisation, role, memberships, full_name, preferred_language } = data;

        login({
          user: data,
          user_id: user_id,
          email: email,
          full_name: full_name,
          preferred_language: preferred_language,
          role: role,
          tokens: tokens,
          organisation: organisation,
          memberships: memberships
        });

        showToast({ message: t('toast.success.message'), severity: "success" });

        // Force a page reload to ensure all auth states are properly initialized
        router.push(`/${pathname.split('/')[1]}/dashboard`);
      }
    }
    catch (error) {
      const errorMessage = resolveLoginErrorMessage(error);
      showToast({ message: errorMessage, severity: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 p-8">
        <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-indigo-600 shadow-md">
          <span className="text-white text-3xl font-extrabold tracking-wide">AP</span>
        </div>

        <div className="text-center">
          <Typography variant="h5" fontWeight={600}>
            {t('title')}
          </Typography>
          <Typography variant="body2">{t('subtitle')}</Typography>
        </div>
      </div>

      <div className="flex items--center">
        <form className="w-full max-w-md mx-auto flex flex-col gap-5 p-8" onSubmit={handleSubmit}>
          {/* Email */}
          <TextField
            label={t('form.email.label')}
            type="email"
            value={email}
            onChange={handleEmailChange}
            fullWidth
            error={!!errors.email}
            helperText={errors.email}
            sx={{
              '& .MuiFormHelperText-root': {
                color: '#9CA3AF !important',
              },
              ...(!errors.email && touched.email
                ? {
                    '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'green',
                    },
                  }
                : {}),
            }}
          />

          {/* Password */}
          <TextField
            label={t('form.password.label')}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={handlePasswordChange}
            fullWidth
            error={!!errors.password}
            helperText={errors.password}
            sx={{
              '& .MuiFormHelperText-root': {
                color: '#9CA3AF !important',
              },
              ...(!errors.password && touched.password
                ? {
                    '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'green',
                    },
                  }
                : {}),
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Remember me + Forgot password */}
          <div className="flex items-center justify-between">
            <FormControlLabel control={<Checkbox />} label={t('form.remember-me')} />

            <Link href={`/${currentLocale}/forgot-password`} underline="hover" className="text-sm">
              {t('form.forgot-password')}
            </Link>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            variant="contained"
            size="large"
            className="!mt-2 !rounded-xl !py-3"
            disabled={isLoading}
          >
            {isLoading ? t('form.buttons.loading') : t('form.buttons.sign-in')}
          </Button>
        </form>
      </div>

      <div className="text-center text-md text-gray-600 mt-4">
        {t('dont-have-account')}{' '}
        <Link href="/register" underline="hover" className="font-medium">
          {t('create-account')}
        </Link>
      </div>
    </div>
  );
}
