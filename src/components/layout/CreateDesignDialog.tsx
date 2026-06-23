import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

type Step = 0 | 1 | 2;
const STEPS = ['Name', 'Attachment', 'Review'] as const;

interface DesignForm {
  name: string;
  description: string;
  variantType: string;
  attachmentType: string;
  owner: string;
  attachmentHeight: string;
  strand: string;
}

const EMPTY_FORM: DesignForm = {
  name: '', description: '', variantType: '',
  attachmentType: '', owner: '', attachmentHeight: '', strand: '',
};

const VARIANT_OPTIONS = ['Proposed', 'Existing', 'Remedy'];
const ATTACHMENT_TYPE_OPTIONS = ['Fiber', 'Copper', 'Coax', 'Power'];
const STRAND_OPTIONS = ['1/4" EHS', '3/8" EHS', '6M', '10M'];

export interface VersionFormMeta {
  name: string;
  description?: string;
  variantType?: string;
}

interface CreateDesignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (meta: VersionFormMeta) => void;
  /** Optional context shown in the header, e.g. the version it branches from. */
  sourceLabel?: string;
}

export function CreateDesignDialog({ open, onOpenChange, onSubmit, sourceLabel }: CreateDesignDialogProps) {
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<DesignForm>(EMPTY_FORM);

  if (!open) return null;

  const set = (patch: Partial<DesignForm>) => setForm(f => ({ ...f, ...patch }));

  const close = () => {
    onOpenChange(false);
    setStep(0);
    setForm(EMPTY_FORM);
  };

  const handleCreate = () => {
    onSubmit({
      name: form.name.trim() || 'Untitled version',
      description: form.description.trim() || undefined,
      variantType: form.variantType || undefined,
    });
    close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="w-[480px] max-w-full flex flex-col gap-6 p-8 rounded-xl border border-[#e5e5e5] bg-white shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-xl leading-6 text-[#0a0a0a]">Create version</h2>
          {sourceLabel && (
            <p className="text-xs text-[#737373]">Branching from <span className="font-medium text-[#3c404d]">{sourceLabel}</span></p>
          )}
        </div>

        {/* Step tabs */}
        <div className="flex items-center w-full">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={cn(
                'flex-1 flex items-center justify-center min-h-8 px-3 py-1.5 text-sm font-medium text-center transition-colors',
                i === step
                  ? 'border-b-2 border-[#3c404d] text-[#0a0a0a]'
                  : 'border-b border-[#c9cdd2] text-[#898d97]'
              )}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Step body */}
        {step === 0 && (
          <div className="flex flex-col gap-4 w-full">
            <Field label="Version name">
              <TextInput value={form.name} onChange={v => set({ name: v })} placeholder="e.g. Fiber make-ready" />
            </Field>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={e => set({ description: e.target.value })}
                placeholder="Description"
                className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-[#e5e5e5] bg-white text-[#0a0a0a] outline-none focus:border-[#363687] placeholder:text-[#737373] resize-none shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
              />
            </Field>
            <Field label="Variant type">
              <SelectInput value={form.variantType} onChange={v => set({ variantType: v })} options={VARIANT_OPTIONS} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex gap-4 w-full">
              <Field label="Attachment type" className="flex-1 min-w-0">
                <SelectInput value={form.attachmentType} onChange={v => set({ attachmentType: v })} options={ATTACHMENT_TYPE_OPTIONS} />
              </Field>
              <Field label="Owner" className="flex-1 min-w-0">
                <TextInput value={form.owner} onChange={v => set({ owner: v })} placeholder="Value" />
              </Field>
            </div>
            <div className="flex gap-4 w-full">
              <Field label="Attachment height" className="flex-1 min-w-0">
                <TextInput value={form.attachmentHeight} onChange={v => set({ attachmentHeight: v })} placeholder={`21'0"`} />
              </Field>
              <Field label="Strand" className="flex-1 min-w-0">
                <SelectInput value={form.strand} onChange={v => set({ strand: v })} options={STRAND_OPTIONS} />
              </Field>
            </div>
            <Field label="Variant type">
              <SelectInput value={form.variantType} onChange={v => set({ variantType: v })} options={VARIANT_OPTIONS} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4 w-full text-sm text-black">
            <ReviewRow label="Version name:" value={form.name || '—'} />
            <div className="flex flex-col gap-1 w-full">
              <p className="font-medium">Description:</p>
              <p className="font-normal text-[#3c404d]">{form.description || '—'}</p>
            </div>
            <ReviewRow label="Attachment type:" value={form.attachmentType || '—'} />
            <ReviewRow label="Owner:" value={form.owner || '—'} />
            <ReviewRow label="Attachment height:" value={form.attachmentHeight || '—'} />
            <ReviewRow label="Strand:" value={form.strand || '—'} />
            <ReviewRow label="Variant type:" value={form.variantType || '—'} />
          </div>
        )}

        {/* Button group */}
        <div className={cn('flex items-center w-full', step === 0 ? 'justify-end gap-2' : 'justify-between')}>
          {step > 0 && (
            <DialogButton variant="outline" onClick={() => setStep(s => (s - 1) as Step)}>Back</DialogButton>
          )}
          <div className="flex items-center gap-2">
            <DialogButton variant="outline" onClick={close}>Cancel</DialogButton>
            {step < 2 ? (
              <DialogButton variant="primary" onClick={() => setStep(s => (s + 1) as Step)}>Continue</DialogButton>
            ) : (
              <DialogButton variant="primary" onClick={handleCreate}>Create</DialogButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1 w-full', className)}>
      <label className="text-sm font-medium text-[#0a0a0a] leading-5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-9 px-3 text-sm rounded-lg border border-[#e5e5e5] bg-white text-[#0a0a0a] outline-none focus:border-[#363687] placeholder:text-[#737373] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
    />
  );
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(
          'w-full h-9 pl-3 pr-9 text-sm rounded-lg border border-[#e5e5e5] bg-white outline-none focus:border-[#363687] appearance-none cursor-pointer shadow-[0px_1px_2px_rgba(0,0,0,0.05)]',
          value ? 'text-[#0a0a0a]' : 'text-[#737373]'
        )}
      >
        <option value="" disabled>Choose</option>
        {options.map(o => <option key={o} value={o} className="text-[#0a0a0a]">{o}</option>)}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] pointer-events-none" />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 w-full">
      <p className="flex-1 min-w-0 font-medium">{label}</p>
      <p className="font-normal text-[#3c404d] text-right">{value}</p>
    </div>
  );
}

function DialogButton({
  variant, onClick, children,
}: {
  variant: 'outline' | 'primary';
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center min-h-9 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
        variant === 'primary'
          ? 'bg-[#171717] text-[#fafafa] hover:bg-[#2a2a2a]'
          : 'border border-[#d4d4d4] bg-white text-[#0a0a0a] hover:bg-neutral-50 shadow-[0px_1px_2px_rgba(0,0,0,0.05)]'
      )}
    >
      {children}
    </button>
  );
}
