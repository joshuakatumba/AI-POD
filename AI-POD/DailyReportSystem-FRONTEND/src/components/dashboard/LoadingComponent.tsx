'use client';

import { Box } from '@mui/material';

export function LoadingComponent() {
  return (
    <Box className="w-full max-w-md mx-auto flex flex-col items-center justify-center gap-4 p-8 min-h-[200px]">
      <div className="relative">
        {/* Pulse Ring */}
        <div className="absolute inset-0 rounded-xl bg-indigo-400 animate-ping opacity-30" />

        {/* Main Logo */}
        <div className="relative w-16 h-16 flex items-center justify-center rounded-xl bg-indigo-600 shadow-lg animate-pulse">
          <span className="text-white text-3xl font-extrabold tracking-wide select-none">
            AP
          </span>
        </div>
      </div>

      {/* Loading Text */}
      {/* <p className="text-sm text-slate-500 animate-pulse">
        Loading...
      </p> */}
    </Box>
  );
}