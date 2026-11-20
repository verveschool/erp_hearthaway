'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

type WorkspaceDialogProps = {
  label: string;
  onDismiss: () => void;
  drawer?: boolean;
  children: ReactNode;
};

export function WorkspaceDialog({ label, onDismiss, drawer, children }: WorkspaceDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={drawer ? 'ha-dialog ha-drawer' : 'ha-dialog'}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }}
    >
      {children}
    </dialog>
  );
}
