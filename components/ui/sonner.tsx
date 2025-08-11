'use client';

import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import { Toaster as Sonner, ToasterProps } from 'sonner';

import { useTheme } from 'next-themes';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="top-center"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      icons={{
        close: <X className="size-4" />,
        success: <CheckCircle className="size-5 text-green-500" />,
        error: <XCircle className="size-5 text-red-500" />,
        warning: <AlertTriangle className="size-5 text-yellow-500" />,
        info: <Info className="size-5 text-blue-500" />,
      }}
      {...props}
    />
  );
};

export { Toaster };
