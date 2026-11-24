'use client';

import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';

export function WorkspaceNotice({ message, clear }: { message: string; clear: (message: string) => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => clear(''), 4000);
    return () => clearTimeout(timer);
  }, [message, clear]);
  return <p role="status" className="workspace-notice">{message && <><CheckCircle2 size={18} aria-hidden="true" /><span>{message}</span></>}</p>;
}
