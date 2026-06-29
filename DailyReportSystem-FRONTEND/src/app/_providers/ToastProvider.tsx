"use client"

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Snackbar, Alert } from "@mui/material";

type ToastSeverity = "success" | "error" | "info" | "warning";

interface ToastOptions {
  message: string;
  severity?: ToastSeverity;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<ToastOptions>({ message: "", severity: "info", duration: 4000 });

  const showToast = (options: ToastOptions) => {
    setToast({ severity: "info", duration: 4000, ...options });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <Snackbar
        open={open}
        autoHideDuration={toast.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleClose} severity={toast.severity} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

// Hook to use anywhere
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context.showToast;
};
