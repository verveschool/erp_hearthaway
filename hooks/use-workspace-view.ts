'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';

// Restore the signed-in user's browsing controls when they return to this workspace.
export function useWorkspaceView<T extends string | boolean>(uid: string, field: string, initial: T) {
  const pathname = usePathname();
  const key = `hearthaway.view.${uid}.${pathname}.${field}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null');
      return typeof saved === typeof initial ? saved as T : initial;
    } catch {
      return initial;
    }
  });
  function change(next: T) {
    setValue(next);
    try {
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      // The control still works when browser storage is unavailable.
    }
  }
  return [value, change] as const;
}
