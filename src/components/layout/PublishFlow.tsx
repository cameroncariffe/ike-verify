import { useEffect, useState, useCallback } from 'react';
import { Loader2, Upload, TriangleAlert, CircleCheck, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type PublishStage = 'confirm' | 'warn' | 'progress' | null;

// ─── Publish dialogs (confirm → optional warning → progress) ──────────────────
export function PublishFlow({
  stage, versionName, failCount, onCancel, onConfirm,
}: {
  stage: PublishStage;
  versionName: string;
  failCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (stage !== 'progress') { setProgress(0); return; }
    const raf = requestAnimationFrame(() => setProgress(100));
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  if (!stage) return null;

  const dismissOnBackdrop = (e: React.MouseEvent) => {
    if (stage !== 'progress' && e.target === e.currentTarget) onCancel();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={dismissOnBackdrop}
    >
      <div className="w-[440px] max-w-full flex flex-col gap-5 p-8 rounded-xl border border-[#e5e5e5] bg-white shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]">

        {stage === 'confirm' && (
          <>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#f4f3fb] shrink-0">
                <Upload size={18} className="text-[#363687]" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-lg leading-6 text-[#0a0a0a]">Publish to IKE Office Pro</h2>
                <p className="text-sm text-[#737373] mt-1">
                  Publish <span className="font-medium text-[#3c404d]">{versionName}</span> back to IKE Office Pro?
                </p>
              </div>
            </div>
            <DialogButtons onCancel={onCancel} onConfirm={onConfirm} confirmLabel="Publish" />
          </>
        )}

        {stage === 'warn' && (
          <>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#fef3c7] shrink-0">
                <TriangleAlert size={18} className="text-[#a16207]" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-lg leading-6 text-[#0a0a0a]">Outstanding errors</h2>
                <p className="text-sm text-[#737373] mt-1">
                  <span className="font-medium text-[#3c404d]">{versionName}</span> still has{' '}
                  <span className="font-medium text-[#b91c1c]">{failCount} failing pole{failCount === 1 ? '' : 's'}</span>.
                  Are you sure you want to publish a version with outstanding errors?
                </p>
              </div>
            </div>
            <DialogButtons onCancel={onCancel} onConfirm={onConfirm} confirmLabel="Publish anyway" danger />
          </>
        )}

        {stage === 'progress' && (
          <div className="flex flex-col items-center gap-5 py-2">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#f4f3fb]">
              <Loader2 size={28} className="text-[#363687] animate-spin" />
            </div>
            <div className="text-center">
              <h2 className="font-semibold text-lg leading-6 text-[#0a0a0a]">Publishing…</h2>
              <p className="text-sm text-[#737373] mt-1">
                Sending <span className="font-medium text-[#3c404d]">{versionName}</span> to IKE Office Pro
              </p>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#ece9f7] overflow-hidden">
              <div
                className="h-full bg-[#363687] rounded-full transition-[width] duration-[3000ms] ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DialogButtons({
  onCancel, onConfirm, confirmLabel, danger = false,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-2 w-full">
      <button
        onClick={onCancel}
        className="flex items-center justify-center min-h-9 px-4 py-2 rounded-lg text-sm font-medium border border-[#d4d4d4] bg-white text-[#0a0a0a] hover:bg-neutral-50 shadow-[0px_1px_2px_rgba(0,0,0,0.05)] transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className={cn(
          'flex items-center justify-center min-h-9 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors',
          danger ? 'bg-[#b91c1c] hover:bg-[#a31818]' : 'bg-[#363687] hover:bg-[#2f2f78]',
        )}
      >
        {confirmLabel}
      </button>
    </div>
  );
}

// ─── Success toaster (top-center, slides in/out) ──────────────────────────────
export function PublishToast({
  versionName, onClose,
}: {
  versionName: string | null;
  onClose: () => void;
}) {
  const [show, setShow] = useState(false);

  const dismiss = useCallback(() => {
    setShow(false);
    window.setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    if (!versionName) { setShow(false); return; }
    const raf = requestAnimationFrame(() => setShow(true));
    const t = window.setTimeout(dismiss, 5000);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t); };
  }, [versionName, dismiss]);

  if (!versionName) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-[380px] max-w-[calc(100vw-2rem)]">
      <div className={cn(
        'flex items-start gap-2 rounded-lg border border-[#e5e5e5] border-l-4 border-l-[#1fa163] bg-white p-3 shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out',
        show ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0',
      )}>
        <CircleCheck size={18} className="shrink-0 mt-0.5 text-[#1fa163]" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#2a2f3c]">Published to IKE Office Pro</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">{versionName} was published successfully.</p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 -mt-0.5 -mr-0.5 p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-black/5 transition-colors"
          title="Dismiss"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
