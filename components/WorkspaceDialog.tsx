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
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      dialog.close();
      // Native dialogs restore focus normally; a detached nested action can
      // leave it on the body. Restore a surviving trigger without scrolling.
      if (trigger?.isConnected && document.activeElement === document.body) trigger.focus({ preventScroll: true });
    };
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
