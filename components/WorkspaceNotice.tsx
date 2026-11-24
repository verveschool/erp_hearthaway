'use client';

import { useEffect } from 'react';

export function WorkspaceNotice({ message, clear }: { message: string; clear: (message: string) => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => clear(''), 4000);
    return () => clearTimeout(timer);
  }, [message, clear]);
  return <p role="status" className="workspace-notice">{message}</p>;
}
