'use client';

import React from 'react';
import DashboardShell from '@/components/layout/DashboardShell';


export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell mode="chat">{children}</DashboardShell>;
}