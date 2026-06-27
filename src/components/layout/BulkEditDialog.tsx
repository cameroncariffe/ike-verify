import { useState, useEffect } from 'react';
import { ChevronDown, Lock, Pencil } from 'lucide-react';
import type { Pole } from '../../types';
import { cn } from '../../lib/utils';

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Poles the changes will be applied to. */
  count: number;
  /** Viewed version isn't editable (imported or non-active). */
  readOnly?: boolean;
  /** Why the version can't be edited, for guidance text. */
  readOnlyReason?: 'original' | 'inactive' | null;
  onApply: (patch: Partial<Pole>) => void;
}

const STATUS_OPTIONS = ['HOA Complete', 'In Progress', 'Pending Review'];
const OWNER_OPTIONS = ['ELECTRIC > 001-Evergy', 'ELECTRIC > 002-Evergy', 'COMM > AT&T', 'COMM > Lumen'];

type FieldKey = 'status' | 'owner' | 'type' | 'note';

interface FieldState {
  enabled: boolean;
  value: string;
}

const EMPTY: Record<FieldKey, FieldState> = {
  status: { enabled: false, value: STATUS_OPTIONS[0] },
  owner: { enabled: false, value: OWNER_OPTIONS[0] },
  type: { enabled: false, value: '' },
  note: { enabled: false, value: '' },
};

export function BulkEditDialog({
  open, onOpenChange, count, readOnly = false, readOnlyReason = null, onApply,
}: BulkEditDialogProps) {
  const [fields, setFields] = useState<Record<FieldKey, FieldState>>(EMPTY);

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (open) setFields(EMPTY);
  }, [open]);

  if (!open) return null;

  const close = () => onOpenChange(false);

  const setField = (key: FieldKey, patch: Partial<FieldState>) =>
    setFields(f => ({ ...f, [key]: { ...f[key], ...patch } }));

  const enabledCount = (Object.keys(fields) as FieldKey[]).filter(k => fields[k].enabled).length;
  const canApply = !readOnly && enabledCount > 0;

  const handleApply = () => {
    const patch: Partial<Pole> = {};
    (Object.keys(fields) as FieldKey[]).forEach(k => {
      if (fields[k].enabled) patch[k] = fields[k].value;
    });
    onApply(patch);
    close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="w-[480px] max-w-full flex flex-col gap-5 p-8 rounded-xl border border-[#e5e5e5] bg-white shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-xl leading-6 text-[#0a0a0a]">Bulk edit poles</h2>
          <p className="text-xs text-[#737373]">
            Apply changes to <span className="font-medium text-[#3c404d]">{count} selected pole{count === 1 ? '' : 's'}</span>
          </p>
        </div>

        {readOnly ? (
          <div className="flex items-start gap-2 rounded-lg border border-[#e3e1f3] bg-[#f4f3fb] px-3 py-2.5">
            <Lock size={15} className="text-[#363687] shrink-0 mt-0.5" />
            <p className="text-[13px] text-[#2a2f3c] leading-snug">
              {readOnlyReason === 'inactive'
                ? 'This version is read-only. Set it as the active version to edit poles.'
                : 'The imported design is read-only. Create a version to edit poles.'}
            </p>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] text-[#737373]">
            <Pencil size={12} />
            Only the fields you enable will be changed. Edited poles must be re-run.
          </p>
        )}

        <div className="flex flex-col divide-y divide-[#f0f0f0]">
          <BulkField
            label="Status"
            enabled={fields.status.enabled}
            disabled={readOnly}
            onToggle={v => setField('status', { enabled: v })}
          >
            <SelectInput value={fields.status.value} onChange={v => setField('status', { value: v })} options={STATUS_OPTIONS} disabled={!fields.status.enabled || readOnly} />
          </BulkField>

          <BulkField
            label="Owner"
            enabled={fields.owner.enabled}
            disabled={readOnly}
            onToggle={v => setField('owner', { enabled: v })}
          >
            <SelectInput value={fields.owner.value} onChange={v => setField('owner', { value: v })} options={OWNER_OPTIONS} disabled={!fields.owner.enabled || readOnly} />
          </BulkField>

          <BulkField
            label="Type"
            enabled={fields.type.enabled}
            disabled={readOnly}
            onToggle={v => setField('type', { enabled: v })}
          >
            <TextInput value={fields.type.value} onChange={v => setField('type', { value: v })} placeholder="e.g. Douglas Fir > 3 > 45" disabled={!fields.type.enabled || readOnly} />
          </BulkField>

          <BulkField
            label="Note"
            enabled={fields.note.enabled}
            disabled={readOnly}
            onToggle={v => setField('note', { enabled: v })}
          >
            <TextInput value={fields.note.value} onChange={v => setField('note', { value: v })} placeholder="Add a note to each pole" disabled={!fields.note.enabled || readOnly} />
          </BulkField>
        </div>

        <div className="flex items-center justify-end gap-2 w-full">
          <DialogButton variant="outline" onClick={close}>Cancel</DialogButton>
          <DialogButton variant="primary" onClick={handleApply} disabled={!canApply}>
            Apply{enabledCount > 0 ? ` (${enabledCount})` : ''}
          </DialogButton>
        </div>
      </div>
    </div>
  );
}

function BulkField({
  label, enabled, disabled, onToggle, children,
}: {
  label: string;
  enabled: boolean;
  disabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-3 py-2.5">
      <label className={cn('flex items-center gap-2 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled}
          onChange={e => onToggle(e.target.checked)}
          className="w-4 h-4 rounded border-[#c9cdd2] accent-[#363687] cursor-pointer disabled:cursor-not-allowed"
        />
        <span className="text-sm font-medium text-[#0a0a0a]">{label}</span>
      </label>
      <div className={cn(!enabled && 'opacity-40 pointer-events-none')}>{children}</div>
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, disabled,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-9 px-3 text-sm rounded-lg border border-[#e5e5e5] bg-white text-[#0a0a0a] outline-none focus:border-[#363687] placeholder:text-[#737373] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
    />
  );
}

function SelectInput({
  value, onChange, options, disabled,
}: {
  value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean;
}) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        className="w-full h-9 pl-3 pr-9 text-sm rounded-lg border border-[#e5e5e5] bg-white text-[#0a0a0a] outline-none focus:border-[#363687] appearance-none cursor-pointer shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] pointer-events-none" />
    </div>
  );
}

function DialogButton({
  variant, onClick, disabled, children,
}: {
  variant: 'outline' | 'primary';
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center justify-center min-h-9 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        variant === 'primary'
          ? 'bg-[#171717] text-[#fafafa] hover:bg-[#2a2a2a] disabled:bg-[#d4d4d4] disabled:text-white disabled:cursor-not-allowed'
          : 'border border-[#d4d4d4] bg-white text-[#0a0a0a] hover:bg-neutral-50 shadow-[0px_1px_2px_rgba(0,0,0,0.05)]'
      )}
    >
      {children}
    </button>
  );
}
