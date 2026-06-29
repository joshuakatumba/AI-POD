import { Box, Skeleton } from '@mui/material';

export default function SkeletonRow() {
  return (
    <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Skeleton
        variant="rectangular"
        width={16}
        height={16}
        sx={{ borderRadius: 0.5, flexShrink: 0 }}
      />
      <Box sx={{ flex: 1 }}>
        <Skeleton width="60%" height={14} sx={{ mb: 0.5 }} />
        <Skeleton width="40%" height={12} />
      </Box>
      <Skeleton width={64} height={20} sx={{ borderRadius: 3 }} />
    </Box>
  );
}