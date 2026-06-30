'use client';

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  MenuItem,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  FormLabel,
  CircularProgress,
  Typography,
} from '@mui/material';
import BlockOutlined from '@mui/icons-material/BlockOutlined';
import { useTranslations } from 'next-intl';
import { SubmitHandler, useForm } from 'react-hook-form';
import z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';

import Header from '@/components/Header';
import { useToast } from '@/app/_providers/ToastProvider';
import { useAuth } from '@/app/_contexts/AuthContext';
import { createOrganisationApi } from '@/app/[locale]/organisation/index';

import {
  createOrganisationSchema,
  OrganisationFormData,
  isValidEmail,
  OrganisationFormInput,
} from '@/schema/organisation.schema';

// Import types from _types
import type {
  CreateOrganisationPayload,
  CreateOrganisationResponse,
  InviteResults,
} from '@/_types/organisation';
import { CREATE_ORGANISATION_TOOLTIP } from '@/constants/permissionMessages';
import { canUserCreateOrganisation } from '@/utils/organisationPermissions';

type CreateOrganisationProps = {
  organisationTypes: readonly string[];
};

export default function CreateOrganisation({
  organisationTypes,
}: CreateOrganisationProps) {
  const t = useTranslations('organisation.create');
  const router = useRouter();
  const showToast = useToast();
  const { login, user, memberships } = useAuth();

  const [inviteEmailsInput, setInviteEmailsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteResults, setInviteResults] = useState<InviteResults | null>(null);

  const [organisationPayload, setOrganisationPayload] = useState<CreateOrganisationPayload | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OrganisationFormInput>({
    resolver: zodResolver(createOrganisationSchema),
    defaultValues: {
      name: '',
      type: '',
      description: '',
      email: '',
      country: '',
      inviteMembers: 'no',
      inviteEmails: [],
    },
  });

  const inviteMembers = watch('inviteMembers');
  const allowedToCreate = canUserCreateOrganisation(user, memberships);

  const parseEmails = (input: string): string[] => {
    if (!input.trim()) return [];

    return input
      .split(/[,;]/)
      .map(email => email.trim())
      .filter(email => {
        return email.length > 0 && isValidEmail(email);
      });
  };

  // Get invalid emails count
  const getInvalidEmailsCount = (input: string): number => {
    if (!input.trim()) return 0;

    const allEmails = input
      .split(/[,;]/)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    const invalidEmails = allEmails.filter(email => !isValidEmail(email));
    return invalidEmails.length;
  };

  const buildOrganisationPayload = (data: OrganisationFormData): CreateOrganisationPayload => {
    const payload: CreateOrganisationPayload = {
      name: data.name,
      type: data.type,
      description: data.description || '',
      email: data.email,
      country: data.country || '',
    };

    // Add invited_members array if user chose to invite people and has valid emails
    if (data.inviteMembers === 'yes' && data.inviteEmails && data.inviteEmails.length > 0) {
      payload.invited_members = data.inviteEmails;
    }

    return payload;
  };

  const onSubmit: SubmitHandler<OrganisationFormInput> = async (data) => {
    setIsSubmitting(true);
    setInviteResults(null);

    try {
      // 🔒 Convert INPUT → OUTPUT (defaults applied here)
      const parsed: OrganisationFormData =
        createOrganisationSchema.parse(data);

      const payload = buildOrganisationPayload(parsed);
      setOrganisationPayload(payload);

      const response =
        (await createOrganisationApi.createOrganisation(
          payload
        )) as CreateOrganisationResponse;

      const newOrganisationId =
        response.data?.id ||
        response.id ||
        response.data?.organisation?.id;

      if (!newOrganisationId) {
        throw new Error('No organisation ID returned from server');
      }

      if (
        response.data?.invited_members_added ||
        response.data?.invited_members_failed
      ) {
        setInviteResults({
          added: response.data.invited_members_added,
          failed: response.data.invited_members_failed,
        });
      }

      let successMessage = t('success.organisationCreated');
      if (response.data?.invited_members_added?.length) {
        successMessage += ` ${response.data.invited_members_added.length} ${t(
          'success.membersInvited'
        )}`;
      }

      showToast({
        message: successMessage,
        severity: 'success',
      });

      if (response.tokens && response.user_id) {
        login({
          user_id: response.user_id,
          email: response.email || '',
          role: response.role || '',
          full_name: response.full_name || '',
          preferred_language: response.preferred_language || '',
          tokens: response.tokens,
          organisation: response.organisation || newOrganisationId,
          memberships: response.memberships || [],
          user: response.user || {
            id: response.user_id,
            email: response.email || '',
            organisation: response.organisation || newOrganisationId,
            super_admin: response.user?.super_admin || false,
            is_staff: response.user?.is_staff || false,
            memberships: response.memberships || [],
          },
        });
      }

    const failedInvites = response.data?.invited_members_failed;

    if (failedInvites?.length) {
      setTimeout(() => {
        showToast({
          message: t('errors.someInvitesFailed', {
            count: failedInvites.length,
          }),
          severity: 'warning',
        });
      }, 500);
    }

      setTimeout(() => {
        router.push('/dashboard/');
      }, 1500);
    } catch (error: any) {
      if (
        error.message?.includes('validation') ||
        error.response?.status === 400
      ) {
        showToast({ message: t('errors.validation'), severity: 'error' });
      } else {
        let errorMessage = t('errors.general');

        if (
          error.message?.includes('401') ||
          error.message?.includes('Unauthorized')
        ) {
          errorMessage = t('errors.unauthorized');
        } else if (
          error.message?.includes('403') ||
          error.message?.includes('Members are not allowed')
        ) {
          errorMessage = t('errors.forbidden');
        } else if (error.message?.includes('500')) {
          errorMessage = t('errors.server');
        } else if (error.message?.includes('409')) {
          errorMessage = t('errors.duplicate');
        }

        showToast({ message: errorMessage, severity: 'error' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!allowedToCreate) {
    return (
      <div>
        <Header title={t('noPermission.title')} subtitle={CREATE_ORGANISATION_TOOLTIP} />
        <Box
          className="mx-auto flex w-full max-w-md flex-col items-center gap-4 p-5 text-center"
          role="alert"
          aria-live="polite"
        >
          <Box
            sx={{
              display: 'inline-flex',
              p: 2,
              borderRadius: '50%',
              bgcolor: 'action.hover',
              color: 'text.secondary',
            }}
          >
            <BlockOutlined sx={{ fontSize: 40 }} aria-hidden />
          </Box>
          <Typography variant="body1" color="text.secondary">
            {CREATE_ORGANISATION_TOOLTIP}
          </Typography>
          <Button
            variant="contained"
            className="!rounded-xl"
            onClick={() => router.push('/dashboard/')}
          >
            {t('noPermission.back')}
          </Button>
        </Box>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <Header
        title={t('title')}
        subtitle={t('subtitle')}
      />

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md mx-auto flex flex-col gap-5 p-5"
      >
        {/* Name */}
        <TextField
          label={t('form.name.label')}
          placeholder={t('form.name.placeholder')}
          {...register('name')}
          error={!!errors.name}
          helperText={
            errors.name ? t(`errors.name.${errors.name.message}`) : ''
          }
          fullWidth
          disabled={isSubmitting}
        />

        {/* Type */}
        <TextField
          select
          label={t('form.type.label')}
          {...register('type')}
          error={!!errors.type}
          helperText={
            errors.type ? t(`errors.type.${errors.type.message}`) : ''
          }
          fullWidth
          disabled={isSubmitting}
        >
          <MenuItem value="">{t('form.type.placeholder')}</MenuItem>
          {organisationTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {t(`form.type.options.${type}`)}
            </MenuItem>
          ))}
        </TextField>

        {/* Description */}
        <TextField
          label={t('form.description.label')}
          placeholder={t('form.description.placeholder')}
          {...register('description')}
          error={!!errors.description}
          helperText={
            errors.description
              ? t(`errors.description.${errors.description.message}`)
              : ''
          }
          multiline
          minRows={3}
          fullWidth
          disabled={isSubmitting}
        />

        {/* Email */}
        <TextField
          label={t('form.email.label')}
          placeholder={t('form.email.placeholder')}
          {...register('email')}
          error={!!errors.email}
          helperText={
            errors.email ? t(`errors.email.${errors.email.message}`) : ''
          }
          fullWidth
          disabled={isSubmitting}
        />

        {/* Country */}
        <TextField
          label={t('form.country.label')}
          placeholder={t('form.country.placeholder')}
          {...register('country')}
          fullWidth
          disabled={isSubmitting}
        />

        {/* Invite Members */}
        <FormControl disabled={isSubmitting}>
          <FormLabel>{t('form.inviteMembers.label')}</FormLabel>
          <RadioGroup
            row
            value={watch('inviteMembers')}
            onChange={(e) => {
              setValue('inviteMembers', e.target.value as 'yes' | 'no', {
                shouldValidate: true
              });
              // Clear invite emails when switching to no
              if (e.target.value === 'no') {
                setInviteEmailsInput('');
                setValue('inviteEmails', []);
              }
            }}
          >
            <FormControlLabel
              value="yes"
              control={<Radio />}
              label={t('form.inviteMembers.yes')}
              disabled={isSubmitting}
            />
            <FormControlLabel
              value="no"
              control={<Radio />}
              label={t('form.inviteMembers.no')}
              disabled={isSubmitting}
            />
          </RadioGroup>
        </FormControl>

        {/* Invite Emails */}
        {inviteMembers === 'yes' && (
          <TextField
            label={t('form.inviteEmails.label')}
            placeholder={t('form.inviteEmails.placeholder')}
            value={inviteEmailsInput}
            onChange={(e) => {
              const value = e.target.value;
              setInviteEmailsInput(value);
              const emails = parseEmails(value);
              setValue('inviteEmails', emails, {
                shouldValidate: true,
              });
            }}
            error={!!errors.inviteEmails || getInvalidEmailsCount(inviteEmailsInput) > 0}
            helperText={
              errors.inviteEmails
                ? t(`errors.inviteEmails.${errors.inviteEmails.message}`)
                : inviteEmailsInput
                  ? `${t('form.inviteEmails.helper')} - ${parseEmails(inviteEmailsInput).length} valid ${t('form.inviteEmails.emails')}`
                  : t('form.inviteEmails.helper')
            }
            fullWidth
            multiline
            minRows={2}
            disabled={isSubmitting}
          />
        )}

        {/* Invite Results Summary - Show if there were any issues */}
        {inviteResults?.failed && inviteResults.failed.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
            <p className="text-sm text-yellow-800 font-medium">
              {inviteResults.failed.length} {t('invites.failed')}
            </p>
            <details className="mt-1">
              <summary className="text-xs text-yellow-600 cursor-pointer">
                {t('invites.viewDetails')}
              </summary>
              <ul className="mt-2 text-xs text-yellow-700 list-disc pl-4">
                {inviteResults.failed.slice(0, 3).map((failed, idx) => (
                  <li key={idx}>{failed.email}: {failed.error}</li>
                ))}
                {inviteResults.failed.length > 3 && (
                  <li>...and {inviteResults.failed.length - 3} more</li>
                )}
              </ul>
            </details>
          </div>
        )}

        {/* Show success summary if all invites succeeded */}
        {inviteResults?.added && inviteResults.added.length > 0 && !inviteResults?.failed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
            <p className="text-sm text-green-800 font-medium">
              {inviteResults.added.length} {t('invites.successful')}
            </p>
          </div>
        )}

        <Button
          type="submit"
          variant="contained"
          size="large"
          className="!mt-2 !rounded-xl !py-3"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            t('form.submit')
          )}
        </Button>
      </form>
    </div>
  );
}
