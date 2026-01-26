'use client';

import { useEffect } from 'react';
import { disableDevTools } from '@/lib/security/devtools-blocker';

export default function DevToolsBlocker() {
  useEffect(() => {
    // Only disable DevTools in production
    if (process.env.NODE_ENV === 'production') {
      disableDevTools();
    }
  }, []);

  return null;
}