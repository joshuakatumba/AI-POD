'use client'

import ComingSoon from '@/components/ComingSoon'
import { useAuth } from '@/app/_contexts/AuthContext'
import { Box } from '@mui/material'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminDashboardPage() {
  const t = useTranslations('admin.dashboard')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ComingSoon
        title={t('title')}
        description={t('description')}
        showBackButton={false}
      />
    </Box>
  )
}

