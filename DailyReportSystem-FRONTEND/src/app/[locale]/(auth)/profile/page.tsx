'use client'

import React, { useState, useEffect } from 'react';
import {
    Button,
    TextField,
    Typography,
    Avatar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/app/_contexts/AuthContext';
import { updateOrganisationMemberAPI } from '@/app/[locale]/organisation/index';
import { useToast } from '@/app/_providers/ToastProvider';
import { usePathname, useRouter } from 'next/navigation';
import {
    persistLocale,
    resolveLocale,
    toSupportedLocale,
} from '@/utils/localePreference';


const SetupProfilePage = () => {
    const t = useTranslations('dashboard.profile');
    const router = useRouter()
    const pathname = usePathname();
    const { user, memberships, setMemberships } = useAuth()
    const showToast = useToast();
    const [displayName, setDisplayName] = useState<string>('');
    const [preferredLanguage, setPreferredLanguage] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false)

    useEffect(() => {
        if (memberships) {
            const current = memberships.find((m: any) => m.is_current);

            const displayName = current?.display_name || user?.full_name || '';
            setDisplayName(displayName);
            const lang = current?.preferred_language || user?.preferred_language;
            if (lang) setPreferredLanguage(lang);

            if (displayName) { setDisplayName(displayName) }
            const preferred_language = current?.preferred_language
            if (preferred_language) { setPreferredLanguage(preferred_language) }
        }
    }, [memberships, user]);
    const languages = [
        { value: "en", label: t('english') },
        { value: "ja", label: t('japanese') }
    ];


    // Logic to get the first letter for the avatar preview
    const avatarLetter = displayName.trim().charAt(0).toUpperCase();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!user) return;
        if (!displayName.trim()) return;

        setLoading(true);
        try {
            const data = await updateOrganisationMemberAPI(
                user.organisation,
                user.membership,
                {
                    "display_name": displayName,
                    "preferred_language": preferredLanguage
                }
            );

            if (data) {
                setMemberships((prev) =>
                    prev.map((membership) =>
                        membership.id === user.membership
                            ? { ...membership, display_name: displayName, preferred_language: preferredLanguage }
                            : membership
                    )
                );

                showToast({ message: t('toast.success.message'), severity: "success" });
                const pathLocale = resolveLocale(pathname.split('/')[1] ?? null);
                const preferredLocale = toSupportedLocale(preferredLanguage);
                const nextLocale = preferredLocale ?? pathLocale;

                persistLocale(nextLocale, { setOverride: true });
                router.push(`/${nextLocale}/dashboard`);
            }
        } catch (error) {
            let errorMessage = t('toast.error.defaultMessage')
            showToast({ message: errorMessage, severity: "error" });
        }
    }

    return (
        <div>
            <div className="w-full max-w-md mx-auto flex flex-col items-center gap-6 p-8">
                <Avatar
                    sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'primary.main',
                        fontSize: '2rem',
                        boxShadow: 2
                    }}
                >
                    {avatarLetter || <PersonIcon fontSize="large" />}
                </Avatar>

                <div className="text-center">
                    <Typography variant="h5" fontWeight={600}>
                        {t('title')}
                    </Typography>
                    <Typography variant="body2">{t('subtitle')}</Typography>
                </div>
            </div>

            <div className="flex items-center">
                <form className="w-full max-w-md mx-auto flex flex-col gap-5 p-8" onSubmit={handleSubmit}>
                    <TextField
                        label={t('form.displayName.label')}
                        fullWidth
                        required
                        autoFocus
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder={t('form.displayName.placeholder')}
                        variant="outlined"
                        error={displayName.length > 0 && displayName.length < 2}
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
                                    <MenuItem 
                                        key={lang.value}
                                        value={lang.value}>
                                        {lang.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            <Typography variant="caption">{t('pleaseLetUsKnowName')}</Typography>
                        </FormControl>
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={!displayName.trim() || !preferredLanguage || loading}
                            sx={{ py: 1.5, fontWeight: 'bold' }}
                        >
                            {loading ? t('form.buttons.saving') : t('form.buttons.save')}
                        </Button>

                </form>
            </div>
        </div>




    );
};

export default SetupProfilePage;
