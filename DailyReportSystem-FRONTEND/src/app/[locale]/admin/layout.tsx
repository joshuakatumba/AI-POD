'use client';

import React from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useAuth } from '@/app/_contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    if (!user) return
    if (!user.is_staff && !user.super_admin) {
      router.push(`/${pathname.split('/')[1]}/dashboard`)
    }
  }, [pathname, router, user])

  return <DashboardShell>{children}</DashboardShell>;
}