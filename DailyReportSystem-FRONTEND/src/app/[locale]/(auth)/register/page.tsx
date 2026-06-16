'use client';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Typography, TextField, Button, IconButton, InputAdornment, Link } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useToast } from '@/app/_providers/ToastProvider';
import { loginApi, registerApi } from '@/app/[locale]/(auth)/index';
import { useAuth } from '@/app/_contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';


export default function SignUp() {
  const t = useTranslations('register');
  const showToast = useToast();
  const { login } = useAuth()
  const router = useRouter()
  const pathname = usePathname();

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('');
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setLoading] = useState(false);

  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: ''
  });

  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false
  });

  const languages = [
    { value: "en", label: t('form.preferredLanguage.options.en') },
    { value: "ja", label: t('form.preferredLanguage.options.ja') }
  ];

  const validatePassword = (value: string) => {
    if (!value) {
      return t('form.validations.password.required');
    }

    if (value.length < 8) {
      return t('form.validations.password.minLength');
    }
    return '';
  };

  const validateConfirmPassword = (value: string) => {
    if (password.length < 8) {
      return t('form.validations.password.minLength');
    }

    if (!value) {
      return t('toast.error.passwordMismatch');
    }

    if (value !== password) {
      return t('toast.error.passwordMismatch');
    }
    return '';
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setTouched((prev) => ({ ...prev, password: true }));
    setErrors((prev) => ({ ...prev, password: validatePassword(newPassword) }));
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    setTouched((prev) => ({ ...prev, confirmPassword: true }));
    setErrors((prev) => ({ ...prev, confirmPassword: validateConfirmPassword(newConfirmPassword) }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword);
    
    setErrors({ password: passwordError, confirmPassword: confirmPasswordError });
    
    if (passwordError || confirmPasswordError) {
      return;
    }
    setLoading(true);

    try {
      const data = await registerApi({
        full_name: fullName,
        email: email,
        password: password,
        preferred_language: preferredLanguage
      })

      if (data) {
        showToast({ message: t('toast.success.message'), severity: "success" });        router.push(`/${pathname.split('/')[1]}/login`)
      }
    } catch (error) {
      let errorMessage = t('toast.error.defaultMessage')
      showToast({ message: errorMessage, severity: "error" });
    }

    setLoading(false);
  }

  return (
    <div>
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 p-5">
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

      <form className="w-full max-w-md mx-auto flex flex-col gap-5 p-5" onSubmit={handleSubmit}>
        <TextField
          label={t('form.fullName.label')}
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          fullWidth
          required
        />

        <TextField
          label={t('form.email.label')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
        />
        <FormControl fullWidth required>
          <InputLabel>
            {t('form.preferredLanguage.label')}
          </InputLabel>

          <Select
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            label={t('form.preferredLanguage.label')}
            fullWidth
          >
            {languages.map((lang) => (
              <MenuItem key={lang.value} value={lang.value}>
                {lang.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label={t('form.password.label')}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={handlePasswordChange}
          fullWidth
          required
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

        <TextField
          label={t('form.confirm-password.label')}
          type={showConfirm ? 'text' : 'password'}
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          fullWidth
          required
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword}
          sx={{
            '& .MuiFormHelperText-root': {
              color: '#9CA3AF !important',
            },
            ...(!errors.confirmPassword && touched.confirmPassword
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
                <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end">
                  {showConfirm ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button type="submit" variant="contained" size="large" className="!mt-2 !rounded-xl !py-3" disabled={isLoading}>
          {isLoading ? t('form.buttons.loading') : t('form.buttons.signUp')}
        </Button>
      </form>

      <div className="text-center text-md text-gray-600 mt-4">
        {t('already-have-account')}{' '}
        <Link href="/login" underline="hover" className="font-medium">
          {t('login')}
        </Link>
      </div>
    </div>
  );
}
