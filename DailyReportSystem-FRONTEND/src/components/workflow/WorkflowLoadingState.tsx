import { Paper, Stack, Box, Skeleton } from '@mui/material';

export default function WorkflowCardSkeleton() {
  return (
    <Paper elevation={0} sx={{ p: 4, flex: 1, borderRadius: 5, border: '1px solid', borderColor: 'divider' }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between">
          <Skeleton variant="rounded" width={64} height={64} sx={{ borderRadius: 3 }} />
          <Skeleton variant="rounded" width={80} height={28} sx={{ borderRadius: 10 }} />
        </Stack>
        <Box>
          <Skeleton variant="text" width="60%" height={28} />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="80%" />
        </Box>
        <Stack direction="row" justifyContent="space-between" pt={1}>
          <Skeleton variant="text" width={80} />
          <Skeleton variant="rounded" width={70} height={24} sx={{ borderRadius: 1 }} />
        </Stack>
      </Stack>
    </Paper>
  );
}