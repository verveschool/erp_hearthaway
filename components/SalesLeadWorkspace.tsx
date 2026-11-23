'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { StudentDetailDrawer, type RegisterLeadLeaveGuard } from './StudentDetailDrawer';

const desktopQuery = '(min-width: 64rem)';
const minimumPanel = 352;
const minimumQueue = 248;
const dividerWidth = 16;
const defaultPanel = 512;

function subscribeToDesktop(onChange: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function SalesLeadWorkspace({ studentId, userId, onClose, registerLeaveGuard, children }: {
  studentId: string | null;
  userId: string;
  onClose: () => void;
  registerLeaveGuard: RegisterLeadLeaveGuard;
  children: ReactNode;
}) {
  const desktop = useSyncExternalStore(subscribeToDesktop, () => window.matchMedia(desktopQuery).matches, () => false);
  const split = desktop && Boolean(studentId);
  const workspace = useRef<HTMLDivElement>(null);
  const dragOffset = useRef(0);
  const [workspaceWidth, setWorkspaceWidth] = useState(0);
  const storageKey = `hearthaway.sales.lead-panel-width.${userId}`;
  const [preferredWidth, setPreferredWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey));
      return saved >= minimumPanel && Number.isFinite(saved) ? saved : defaultPanel;
    } catch {
      return defaultPanel;
    }
  });

  useEffect(() => {
    const element = workspace.current;
    if (!element || !desktop) return;
    const observer = new ResizeObserver(([entry]) => setWorkspaceWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [desktop]);

  const maximumPanel = Math.max(minimumPanel, Math.floor(workspaceWidth) - minimumQueue - dividerWidth);
  const clamp = (width: number) => Math.min(maximumPanel, Math.max(minimumPanel, Math.round(width)));
  const panelWidth = workspaceWidth ? clamp(preferredWidth) : preferredWidth;

  function rememberWidth(width: number) {
    setPreferredWidth(width);
    try {
      localStorage.setItem(storageKey, String(width));
    } catch {
      // Resizing still works for this session when storage is unavailable.
    }
  }

  return (
    <div
      ref={workspace}
      className="sales-lead-workspace"
      style={split ? { gridTemplateColumns: `minmax(0, 1fr) ${dividerWidth}px minmax(0, ${panelWidth}px)` } : undefined}
    >
      <section id="sales-lead-queue" aria-label="Lead queue" className="sales-lead-queue">
        {children}
      </section>
      {split && (
        <div
          role="separator"
          aria-label="Lead workspace width"
          aria-describedby="sales-divider-instructions"
          aria-orientation="vertical"
          aria-controls="sales-lead-panel"
          aria-valuemin={minimumPanel}
          aria-valuemax={workspaceWidth ? maximumPanel : panelWidth}
          aria-valuenow={panelWidth}
          aria-valuetext={`${panelWidth} pixels wide`}
          tabIndex={0}
          className="sales-lead-divider"
          title="Drag to resize. Double-click to reset."
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            const rightEdge = workspace.current?.getBoundingClientRect().right;
            if (rightEdge === undefined) return;
            dragOffset.current = rightEdge - event.clientX - panelWidth;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            const rightEdge = workspace.current?.getBoundingClientRect().right;
            if (rightEdge !== undefined) setPreferredWidth(clamp(rightEdge - event.clientX - dragOffset.current));
          }}
          onLostPointerCapture={() => rememberWidth(panelWidth)}
          onDoubleClick={() => rememberWidth(defaultPanel)}
          onKeyDown={(event) => {
            const widths: Record<string, number> = {
              ArrowLeft: clamp(panelWidth + 24),
              ArrowRight: clamp(panelWidth - 24),
              Home: minimumPanel,
              End: maximumPanel,
              Enter: defaultPanel,
            };
            if (!Object.hasOwn(widths, event.key)) return;
            event.preventDefault();
            rememberWidth(widths[event.key]);
          }}
        >
          <GripVertical aria-hidden="true" size={14} />
          <span id="sales-divider-instructions" className="sr-only">
            Use the arrow keys to resize, Home and End for the limits, or Enter to reset.
          </span>
        </div>
      )}
      {studentId && (
        <StudentDetailDrawer studentId={studentId} embedded={split} onClose={onClose} registerLeaveGuard={registerLeaveGuard} />
      )}
    </div>
  );
}
