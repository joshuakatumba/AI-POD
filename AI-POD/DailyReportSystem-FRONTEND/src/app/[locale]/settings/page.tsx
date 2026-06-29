'use client';

import { Box } from '@mui/material';
import ComingSoon from '@/components/ComingSoon';

export default function SettingsPage() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <ComingSoon
                title="Settings Coming Soon"
                description="We are refining the settings panel to help you manage your account better."
            />
        </Box>
    );
}