import { useEffect, useState, useCallback } from 'react';
import { Loader2, X, CircleCheck, CircleX, CircleAlert } from 'lucide-react';
import { ValidationSummaryBadges } from '../ui/ValidationBadge';
import { cn } from '../../lib/utils';

interface RunSummary {
  total: number;
  pass: number;
  fail: number;
  warning: number;
  review: number;
}

// ─── Processing dialog (shown while rules run) ────────────────────────────────
export function RuleRunDialog({
  open, ruleSetName, poleCount, onStop,
}: {
  open: boolean;
  ruleSetName: string;
  poleCount: number;
  onStop: () => void;
}) {
  const [progress, setProgress] = useState(0);

  // Drive the determinate bar from 0 → 100 over the 3s run window.
  useEffect(() => {
    if (!open) { setProgress(0); return; }
    const start = requestAnimationFrame(() => setProgress(100));
    return () => cancelAnimationFrame(start);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-[420px] max-w-full flex flex-col items-center gap-5 p-8 rounded-xl border border-[#e5e5e5] bg-white shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#f4f3fb]">
          <Loader2 size={28} className="text-[#363687] animate-spin" />
        </div>

        <div className="text-center">
          <h2 className="font-semibold text-lg leading-6 text-[#0a0a0a]">Running rules…</h2>
          <p className="text-sm text-[#737373] mt-1">
            Checking <span className="font-medium text-[#3c404d]">{poleCount} pole{poleCount === 1 ? '' : 's'}</span> against{' '}
            <span className="font-medium text-[#3c404d]">{ruleSetName}</span>
          </p>
        </div>

        <div className="w-full h-1.5 rounded-full bg-[#ece9f7] overflow-hidden">
          <div
            className="h-full bg-[#363687] rounded-full transition-[width] duration-[3000ms] ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <button
          onClick={onStop}
          className="flex items-center justify-center min-h-9 px-5 py-2 rounded-lg text-sm font-medium border border-[#d4d4d4] bg-white text-[#0a0a0a] hover:bg-neutral-50 shadow-[0px_1px_2px_rgba(0,0,0,0.05)] transition-colors"
        >
          Stop
        </button>
      </div>
    </div>
  );
}

// ─── Result toaster (summary, auto-dismiss after 5s) ──────────────────────────
export interface ResultToastData {
  ruleSetName: string;
  summary: RunSummary;
  status: 'pass' | 'warning' | 'fail';
}

const TOAST_STYLE: Record<ResultToastData['status'], { accent: string; icon: typeof CircleCheck; iconColor: string; title: string }> = {
  pass:    { accent: 'border-l-[#1fa163]', icon: CircleCheck, iconColor: 'text-[#1fa163]', title: 'All poles passed' },
  warning: { accent: 'border-l-[#a16207]', icon: CircleAlert, iconColor: 'text-[#a16207]', title: 'Completed with warnings' },
  fail:    { accent: 'border-l-[#b91c1c]', icon: CircleX,     iconColor: 'text-[#b91c1c]', title: 'Failures detected' },
};

export function ResultToast({
  toast, onClose,
}: {
  toast: ResultToastData | null;
  onClose: () => void;
}) {
  const [show, setShow] = useState(false);

  // Animate out, then notify the parent to clear it.
  const dismiss = useCallback(() => {
    setShow(false);
    window.setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    if (!toast) { setShow(false); return; }
    const raf = requestAnimationFrame(() => setShow(true));
    const t = window.setTimeout(dismiss, 5000);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t); };
  }, [toast, dismiss]);

  if (!toast) return null;

  const style = TOAST_STYLE[toast.status];
  const Icon = style.icon;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-[380px] max-w-[calc(100vw-2rem)]">
      <div className={cn(
        'flex flex-col gap-2 rounded-lg border border-[#e5e5e5] border-l-4 bg-white p-3 shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)] transition-all duration-300 ease-out',
        style.accent,
        show ? 'translate-y-0 opacity-100' : '-translate-y-6 opacity-0',
      )}>
        <div className="flex items-start gap-2">
          <Icon size={18} className={cn('shrink-0 mt-0.5', style.iconColor)} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#2a2f3c]">{style.title}</p>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              {toast.ruleSetName} · {toast.summary.total} pole{toast.summary.total === 1 ? '' : 's'} checked
            </p>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 -mt-0.5 -mr-0.5 p-1 rounded text-neutral-400 hover:text-neutral-600 hover:bg-black/5 transition-colors"
            title="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
        <ValidationSummaryBadges summary={toast.summary} />
      </div>
    </div>
  );
}
