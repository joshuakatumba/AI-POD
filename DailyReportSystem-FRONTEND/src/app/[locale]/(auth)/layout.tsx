import LanguageToggle from '@/components/LanguageToggle';
import ThemeToggle from '@/components/ThemeToggle';
import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gradient-to-tsr from-white to-[#d0e7ff] relative min-h-screen">
      {/* Theme toggle */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* Centered content */}
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="mx-auto grid w-full max-w-[550px] gap-6">{children}</div>
      </div>
    </div>
  );
}
