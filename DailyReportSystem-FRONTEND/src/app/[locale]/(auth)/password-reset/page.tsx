import { LoadingComponent } from '@/components/dashboard/LoadingComponent';
import ResetPasswordContent from '@/components/password/ResetPasswordContent';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingComponent />}>
      <ResetPasswordContent />
    </Suspense>
  );
}