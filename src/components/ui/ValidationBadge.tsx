import type { ValidationStatus } from '../../types';
import { cn } from '../../lib/utils';

interface ValidationBadgeProps {
  status: ValidationStatus;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}

const badgeConfig: Record<ValidationStatus, { bg: string; border: string; text: string; label: string }> = {
  pass:    { bg: 'bg-[#dcfce7]', border: 'border-[#1fa163]', text: 'text-[#1fa163]', label: 'Pass' },
  fail:    { bg: 'bg-[#ffe2e2]', border: 'border-[#b91c1c]', text: 'text-[#b91c1c]', label: 'Fail' },
  warning: { bg: 'bg-[#fef9c3]', border: 'border-[#a16207]', text: 'text-[#a16207]', label: 'Warning' },
  review:  { bg: 'bg-[#dbeafe]', border: 'border-[#1d4ed8]', text: 'text-[#1d4ed8]', label: 'Review' },
  pending: { bg: 'bg-[#f5f5f5]', border: 'border-[#737373]', text: 'text-[#616571]', label: 'Unverified' },
};

export function ValidationBadge({ status, count, size = 'sm', className }: ValidationBadgeProps) {
  const config = badgeConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px] leading-4' : 'px-3 py-1 text-xs leading-5',
        config.bg, config.border, config.text,
        className
      )}
    >
      {count !== undefined && <span className="font-normal text-[#616571]">{count}</span>}
      {config.label}
    </span>
  );
}

export function ValidationSummaryBadges({
  summary,
}: {
  summary: { pass: number; fail: number; warning: number; review: number };
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <ValidationBadge status="fail" count={summary.fail} />
      <ValidationBadge status="warning" count={summary.warning} />
      <ValidationBadge status="review" count={summary.review} />
      <ValidationBadge status="pass" count={summary.pass} />
    </div>
  );
}
