'use client';

import { Stack, Typography, Box } from '@mui/material';

interface BulletListProps {
  items: string[];
}

export function BulletList({ items }: BulletListProps) {
  return (
    <Stack spacing={1.25}>
      {items.map((item, i) => (
        <Stack key={i} direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              bgcolor: 'text.disabled',
              mt: '0.85',
              flexShrink: 0,
            }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
            {item}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}