import React from 'react';
import { Stack, Typography, Chip, SvgIconProps, useTheme, alpha } from '@mui/material';
import { useTranslations } from 'next-intl';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import { SvgIconTypeMap } from '@mui/material/SvgIcon';
import { getStatusColor } from '../statusUtility';
import { getPriorityColor } from '../priorityUtility';

type IconComponent = OverridableComponent<SvgIconTypeMap<{}, 'svg'>> & {
  muiName: string;
};

type TaskDetailsFieldProps = {
  icon?: IconComponent;
  label: string;
  value?: string | number | null;
  isStatus?: boolean;
  isPriority?: boolean;
  isCategory?: boolean;
  labelWidth?: number;
};

export default function TaskDetailsField({
  icon: Icon,
  label,
  value,
  isStatus = false,
  isPriority = false,
  isCategory = false,
  labelWidth = 140,
}: TaskDetailsFieldProps) {
  const t = useTranslations('tasks');
  const theme = useTheme();

  type StatusChipColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

  type PriorityChipColor = 'success' | 'info' | 'warning' | 'error';

  const toPriorityChipColor = (priority: string): PriorityChipColor => {
    const color = getPriorityColor(priority);

    return color as PriorityChipColor;
  };

  const toStatusChipColor = (status: string): StatusChipColor => {
    const color = getStatusColor(status);
  
    if (color === 'danger') {
      return 'error';
    }
  
    return color as StatusChipColor;
  };

  const priorityColorKey = isPriority ? toPriorityChipColor(String(value ?? '')) : 'info';
  return (
    <Stack direction="row" alignItems="center" spacing={2} py={0.5}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{
          width: labelWidth,
          flexShrink: 0,
        }}
      >
        {Icon && <Icon fontSize="small" sx={{ color: 'text.disabled' }} />}
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Stack>

      {isStatus ? (
        <Chip
          label={t(`status.${value}`)}
          size="small"
          color={toStatusChipColor(String(value ?? ''))}
          variant="outlined"
          sx={{
            fontWeight: 600,
            borderRadius: 1,
            fontSize: 11,
            height: 20,
          }}
        />
      ) : isPriority ? (
        <Chip
          label={t(`create.form.priority.options.${value}`)}
          size="small"
          variant="filled"
          color={priorityColorKey}
          sx={{
            borderRadius: 1.5,
            fontSize: 11,
            fontWeight: 600,
            bgcolor: alpha(theme.palette[priorityColorKey].main, 0.2),
            color: theme.palette[priorityColorKey].main,
          }}
        />
      ) : isCategory ? (
        <Chip
          label={t(`create.form.category.options.${value}`)}
          size="small"
          sx={{
            borderRadius: 1.5,
            fontSize: 11,
            fontWeight: 600,
          }}
        />
      ) : (
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            fontWeight: 500,
            color: 'text.primary',
          }}
        >
          {value ?? '-'}
        </Typography>
      )}
    </Stack>
  );
}
