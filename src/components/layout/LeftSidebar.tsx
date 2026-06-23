import { useState } from 'react';
import {
  Search, ArrowUpDown, ListFilter, LayoutList, List, X,
  ArrowLeftFromLine, ArrowRightFromLine,
  Wand2, BookMarked, CheckCircle, History,
  MoreVertical, UtilityPole,
  Circle, CircleCheck, CircleX, CircleAlert,
  Copy, StickyNote, Save, SquarePen, Upload,
  ChevronDown, Lock, GitBranchPlus, Trash2, FolderGit2, Check, CornerDownRight,
} from 'lucide-react';
import type { Pole, DesignSet, RuleSet, ValidationStatus, VersionStatus } from '../../types';
import { ValidationBadge } from '../ui/ValidationBadge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { CreateDesignDialog, type VersionFormMeta } from './CreateDesignDialog';
import { getVersionStatus } from '../../data/mockData';
import { cn } from '../../lib/utils';

// ─── Pole status helpers ──────────────────────────────────────────────────────
type PoleStatus = 'pass' | 'warning' | 'fail' | 'unverified';

function getPoleStatus(pole: Pole): PoleStatus {
  const results = pole.validationResults ?? [];
  if (results.length === 0) return 'unverified';
  if (results.some(r => r.status === 'fail')) return 'fail';
  if (results.some(r => r.status === 'warning')) return 'warning';
  return 'pass';
}

type SortOption = 'last-modified' | 'collected-at' | 'validation-fail-pass' | 'validation-pass-fail';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'last-modified', label: 'Last modified' },
  { id: 'collected-at', label: 'Collected at' },
  { id: 'validation-fail-pass', label: 'Validation: Fail - Pass' },
  { id: 'validation-pass-fail', label: 'Validation: Pass - Fail' },
];

const STATUS_RANK: Record<PoleStatus, number> = { fail: 0, warning: 1, unverified: 2, pass: 3 };

interface LeftSidebarProps {
  poles: Pole[];
  selectedPoleId: string | null;
  onSelectPole: (poleId: string) => void;
  designSets: DesignSet[];
  activeDesignSetId: string;
  viewedDesignSetId: string;
  /** Per-pole variants can be created (viewing the active version). */
  canCreateVariant: boolean;
  /** Imported/base poles in this view aren't directly editable. */
  baseReadOnly: boolean;
  onSelectVersion: (id: string) => void;
  onSetActiveVersion: (id: string) => void;
  onCreateVersion: (meta: VersionFormMeta) => void;
  onCreateVariants: (poleIds: string[], meta?: VersionFormMeta) => void;
  onPromoteVariant: (variantId: string) => void;
  onRenameVariant: (variantId: string, name: string) => void;
  onDeleteVariant: (variantId: string) => void;
  canPromoteVariant: boolean;
  onRenameVersion: (id: string, name: string) => void;
  onDeleteVersion: (id: string) => void;
  onRunValidation: (ruleSetId: string) => void;
  ruleSets: RuleSet[];
  lastRun?: DesignSet['runHistory'][0];
  runHistory?: DesignSet['runHistory'];
  jobName: string;
}

// ─── Pole status indicator (circle that reflects rule-run results) ────────────
function PoleStatusIndicator({ status }: { status: PoleStatus }) {
  switch (status) {
    case 'pass':
      return <CircleCheck size={20} className="text-[#1fa163] shrink-0" strokeWidth={2} />;
    case 'fail':
      return <CircleX size={20} className="text-[#dc2626] shrink-0" strokeWidth={2} />;
    case 'warning':
      return <CircleAlert size={20} className="text-[#eab308] shrink-0" strokeWidth={2} />;
    case 'unverified':
    default:
      return <Circle size={20} className="text-[#9ea2aa] shrink-0" strokeWidth={2} />;
  }
}

// ─── Item flyout (kebab menu) ─────────────────────────────────────────────────
type PoleAction = 'create-variant' | 'add-note' | 'save-draft' | 'edit-properties' | 'publish';

const POLE_MENU_ITEMS: { id: PoleAction; label: string; icon: typeof Copy }[] = [
  { id: 'create-variant',  label: 'Create new variant', icon: Copy },
  { id: 'add-note',        label: 'Add note',           icon: StickyNote },
  { id: 'save-draft',      label: 'Save draft',         icon: Save },
  { id: 'edit-properties', label: 'Edit properties',    icon: SquarePen },
  { id: 'publish',         label: 'Publish',            icon: Upload },
];

function ItemFlyout({ onAction, canEdit = true }: { onAction: (a: PoleAction) => void; canEdit?: boolean }) {
  const items = canEdit ? POLE_MENU_ITEMS : POLE_MENU_ITEMS.filter(i => i.id !== 'create-variant');
  return (
    <div className="flex flex-col w-[180px]">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onAction(id)}
          className="flex items-center gap-2 min-h-8 px-2 py-1.5 rounded-md text-left hover:bg-[#f5f5f5] transition-colors"
        >
          <Icon size={16} className="text-[#0a0a0a] shrink-0" />
          <span className="text-sm text-[#0a0a0a] whitespace-nowrap">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Pole list row (base pole or nested variant) ──────────────────────────────
function PoleListItem({
  pole, selected, onClick, onAction,
  bulkMode = false, checked = false, onToggleCheck,
  hasVariants = false, expanded = false, onToggleExpand,
  canEdit = true, variantPassed = false,
}: {
  pole: Pole; selected: boolean; onClick: () => void; onAction: (a: PoleAction) => void;
  bulkMode?: boolean; checked?: boolean; onToggleCheck?: () => void;
  hasVariants?: boolean; expanded?: boolean; onToggleExpand?: () => void;
  canEdit?: boolean; variantPassed?: boolean;
}) {
  const status = getPoleStatus(pole);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="pr-2 py-0.5 bg-white flex items-center gap-2 pl-3">
      {/* Bulk-select checkbox — outside the card */}
      {bulkMode && (
        <Checkbox
          checked={checked}
          onCheckedChange={() => onToggleCheck?.()}
          className="shrink-0"
        />
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        className={cn(
          'flex-1 min-w-0 flex items-center gap-1 h-8 pr-1 py-1 pl-2 rounded-[4px] text-left transition-colors group relative cursor-pointer',
          selected
            ? 'bg-[rgba(255,167,14,0.1)] border border-[rgba(255,167,14,0.5)]'
            : 'border border-transparent hover:bg-[rgba(255,167,14,0.1)]'
        )}
      >
        {/* Expand caret (poles that have variants) */}
        {hasVariants ? (
          <button
            onClick={e => { e.stopPropagation(); onToggleExpand?.(); }}
            className="shrink-0 flex items-center justify-center w-4 h-4 -ml-0.5 text-[#9ea2aa] hover:text-[#3c404d]"
            title={expanded ? 'Collapse versions' : 'Expand versions'}
          >
            <ChevronDown size={14} className={cn('transition-transform', expanded ? '' : '-rotate-90')} />
          </button>
        ) : (
          <span className="shrink-0 w-4" />
        )}

        {/* Status indicator */}
        <PoleStatusIndicator status={status} />

        {/* Pole number */}
        <span className="font-barlow text-sm flex-1 text-left truncate text-[#3c404d]">
          {pole.poleNumber}
        </span>

        {/* Variant count chip — green when a child version passes but base hasn't */}
        {hasVariants && (
          <span className={cn(
            'shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-1.5 py-px',
            variantPassed ? 'text-[#1fa163] bg-[#1fa163]/12' : 'text-[#5454a6] bg-[#5454a6]/10',
          )}>
            {variantPassed && <CircleCheck size={10} />}
            {pole.variants!.length}
          </span>
        )}

        {/* Date */}
        <span className="font-barlow text-xs text-[#9ea2aa] shrink-0 text-right whitespace-nowrap">
          {pole.taggedDate}
        </span>

        {/* Kebab */}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger
            onClick={e => e.stopPropagation()}
            className={cn(
              'shrink-0 flex items-center justify-center w-5 h-5 rounded transition-opacity cursor-pointer hover:bg-black/5',
              selected || menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <MoreVertical size={18} className="text-[#3c404d]" />
          </PopoverTrigger>
          <PopoverContent align="start" side="right" sideOffset={4} className="w-auto p-1">
            <ItemFlyout
              canEdit={canEdit}
              onAction={a => { setMenuOpen(false); onAction(a); }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// ─── Pole variant row (nested under a base pole) ──────────────────────────────
function VariantListItem({
  variant, selected, onClick, canPromote, onMakeActive, onRename, onDelete,
}: {
  variant: Pole; selected: boolean; onClick: () => void; canPromote: boolean;
  onMakeActive: () => void; onRename: (name: string) => void; onDelete: () => void;
}) {
  const status = getPoleStatus(variant);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(variant.variantLabel ?? '');

  const commit = () => { const n = name.trim(); if (n) onRename(n); setRenaming(false); };
  const stamp = variant.createdAt
    ? new Date(variant.createdAt).toLocaleString(undefined, { month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit' })
    : '';

  return (
    <div className="pr-2 py-0.5 bg-white flex items-center gap-2 pl-9">
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        className={cn(
          'flex-1 min-w-0 flex items-center gap-1 h-8 pr-1 py-1 pl-1 rounded-[4px] text-left transition-colors group relative cursor-pointer',
          selected
            ? 'bg-[rgba(255,167,14,0.1)] border border-[rgba(255,167,14,0.5)]'
            : 'border border-transparent hover:bg-[rgba(255,167,14,0.1)]'
        )}
      >
        <CornerDownRight size={13} className="text-[#9ea2aa] shrink-0" />
        <PoleStatusIndicator status={status} />

        {renaming ? (
          <input
            autoFocus
            value={name}
            onClick={e => e.stopPropagation()}
            onChange={e => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') setRenaming(false);
            }}
            className="flex-1 min-w-0 h-6 px-1.5 text-sm rounded border border-[#363687] bg-white text-[#5454a6] outline-none"
          />
        ) : (
          <span className="font-barlow text-sm flex-1 text-left truncate text-[#5454a6]">
            {variant.variantLabel}
          </span>
        )}

        {!renaming && stamp && (
          <span className="font-barlow text-xs text-[#9ea2aa] shrink-0 text-right whitespace-nowrap">
            {stamp}
          </span>
        )}

        {!renaming && (
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger
              onClick={e => e.stopPropagation()}
              className={cn(
                'shrink-0 flex items-center justify-center w-5 h-5 rounded transition-opacity cursor-pointer hover:bg-black/5',
                selected || menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
            >
              <MoreVertical size={18} className="text-[#3c404d]" />
            </PopoverTrigger>
            <PopoverContent align="start" side="right" sideOffset={4} className="w-[200px] p-1">
              <div className="flex flex-col">
                {canPromote && (
                  <VersionMenuItem
                    icon={CircleCheck}
                    label="Make active"
                    onClick={() => { setMenuOpen(false); onMakeActive(); }}
                  />
                )}
                <VersionMenuItem
                  icon={SquarePen}
                  label="Rename"
                  onClick={() => { setMenuOpen(false); setName(variant.variantLabel ?? ''); setRenaming(true); }}
                />
                <VersionMenuItem
                  icon={Trash2}
                  label="Delete"
                  danger
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                />
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

// ─── Bottom action button base (shared styling) ───────────────────────────────
const actionButtonClass = (active: boolean) => cn(
  'w-full flex items-center gap-2 h-9 px-2 rounded-lg text-left transition-colors cursor-pointer',
  active
    ? 'bg-white text-[#363687] shadow-sm'
    : 'bg-[#5454a6] text-white hover:bg-[#6262bd] active:bg-[#4a4a99]'
);

// ─── Bottom action button (launches a flyout to the right) ────────────────────
function SidebarActionButton({
  icon, label, open, onOpenChange, badge, children, contentClassName,
}: {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger className={actionButtonClass(open)}>
        <span className="shrink-0 flex items-center">{icon}</span>
        <span className="flex-1 min-w-0 text-sm font-medium leading-5 truncate">{label}</span>
        {badge}
      </PopoverTrigger>
      {/* Opens to the right of the button, bottom edge aligned with the button row */}
      <PopoverContent
        side="right"
        align="end"
        sideOffset={8}
        className={cn('w-[304px] p-0 max-h-[70vh] overflow-y-auto', contentClassName)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

// ─── History flyout body ──────────────────────────────────────────────────────
function HistoryBody({ runs }: { runs: DesignSet['runHistory'] }) {
  return (
    <div className="bg-white px-3 py-3 space-y-2">
      <p className="text-sm font-semibold text-[#2a2f3c]">History</p>
      {runs.length === 0 ? (
        <p className="text-[11px] text-neutral-400">No validation runs yet.</p>
      ) : (
        runs.map(run => (
          <div key={run.id} className="flex items-center gap-2 py-1 border-b border-neutral-100 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#2a2f3c] truncate">{run.ruleSetName}</p>
              <p className="text-[11px] text-neutral-400">{new Date(run.runAt).toLocaleString()}</p>
            </div>
            <span className="text-xs text-neutral-500 shrink-0">{run.summary.total} poles</span>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Rules & Templates section body ──────────────────────────────────────────
function RulesBody({
  ruleSets, onRun, onManage,
}: {
  ruleSets: RuleSet[];
  onRun: (id: string) => void;
  onManage: () => void;
}) {
  return (
    <div className="bg-white border-b border-neutral-100">
      {/* Rule Sets group */}
      <div className="px-3 pt-2 pb-1">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          Rule Sets <span className="font-normal normal-case">{ruleSets.length}</span>
        </p>
      </div>
      {ruleSets.map((rs, i) => (
        <div key={rs.id}>
          {i > 0 && <Separator />}
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#2a2f3c] truncate">{rs.name}</p>
              <p className="text-[11px] text-neutral-400">
                {rs.rules.length} rules · {rs.createdAt}
              </p>
            </div>
            <Button
              size="sm"
              className="h-6 px-2.5 text-xs bg-[#2a2f3c] hover:bg-[#1a1f2c] text-white shrink-0 rounded-full"
              onClick={() => onRun(rs.id)}
            >
              Run
            </Button>
          </div>
        </div>
      ))}

      <Separator className="my-1" />

      {/* Templates group (static demo) */}
      <div className="px-3 pt-1 pb-1">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          Templates <span className="font-normal normal-case">1</span>
        </p>
      </div>
      {[
        { id: 't-1', name: 'Utility Pole Height Validation', date: '04/09/26', count: 2 },
        { id: 't-2', name: 'Utility Pole Height Validation - v2', date: '04/10/26', count: 2 },
      ].map((t, i) => (
        <div key={t.id}>
          {i > 0 && <Separator />}
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#2a2f3c] truncate">{t.name}</p>
              <p className="text-[11px] text-neutral-400">{t.count} rules · {t.date}</p>
            </div>
            <Button
              size="sm"
              className="h-6 px-2.5 text-xs bg-[#2a2f3c] hover:bg-[#1a1f2c] text-white shrink-0 rounded-full"
              onClick={() => {}}
            >
              Run
            </Button>
          </div>
        </div>
      ))}

      {/* Sticky footer action — links to the full Rules & Templates management page (future) */}
      <div className="sticky bottom-0 bg-white border-t border-neutral-200 p-2">
        <Button
          variant="outline"
          className="w-full h-8 text-sm font-medium"
          onClick={onManage}
        >
          Manage Rules & Templates
        </Button>
      </div>
    </div>
  );
}

// ─── Results section body ─────────────────────────────────────────────────────
function ResultsBody({ lastRun }: { lastRun: DesignSet['runHistory'][0] }) {
  return (
    <div className="bg-white border-b border-neutral-100 px-3 py-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-[#2a2f3c]">Validation Results</p>
        <p className="text-[11px] text-neutral-400 mt-0.5">
          RuleSet: {lastRun.ruleSetName} | {new Date(lastRun.runAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <ValidationBadge status="pass"    count={lastRun.summary.pass}    size="md" />
        <ValidationBadge status="warning" count={lastRun.summary.warning} size="md" />
        <ValidationBadge status="review"  count={lastRun.summary.review}  size="md" />
        <ValidationBadge status="fail"    count={lastRun.summary.fail}    size="md" />
      </div>
      <Separator />
      <p className="text-xs font-semibold text-neutral-700">Rule Breakdown</p>
      {[
        { label: 'Comm to LCE Clearance', pass: lastRun.summary.pass, total: lastRun.summary.total },
        { label: 'Ground Clearance',       pass: Math.round(lastRun.summary.pass * 0.9), total: lastRun.summary.total },
      ].map(item => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-sm text-[#2a2f3c] flex-1 truncate">{item.label}</span>
          <span className="text-xs text-neutral-500 shrink-0">{item.pass} / {item.total}</span>
          <Button variant="outline" size="sm" className="h-6 px-2.5 text-xs shrink-0">
            View
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── Sort flyout ──────────────────────────────────────────────────────────────
function SortFlyout({
  value, onChange,
}: {
  value: SortOption;
  onChange: (v: SortOption) => void;
}) {
  return (
    <div className="flex flex-col gap-2 w-[198px]">
      <div className="border-b border-neutral-200 px-2 pb-2">
        <p className="text-base font-medium text-[#0a0a0a]">Sort by</p>
      </div>
      <div className="flex flex-col">
        {SORT_OPTIONS.map(opt => {
          const selected = opt.id === value;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={cn(
                'flex items-center gap-2 min-h-8 px-2 py-1.5 rounded-md text-left transition-colors',
                selected ? 'bg-[#f5f5f5]' : 'hover:bg-[#f5f5f5]'
              )}
            >
              {/* Radio */}
              <span className="flex items-center justify-center w-5 shrink-0">
                <span className={cn(
                  'w-4 h-4 rounded-full border flex items-center justify-center',
                  selected ? 'border-[#171717]' : 'border-neutral-300'
                )}>
                  {selected && <span className="w-2 h-2 rounded-full bg-[#171717]" />}
                </span>
              </span>
              <span className="text-sm text-[#0a0a0a] whitespace-nowrap">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Filter flyout ────────────────────────────────────────────────────────────
function FilterFlyout({
  counts, active, onToggle,
}: {
  counts: Record<PoleStatus, number>;
  active: Set<PoleStatus>;
  onToggle: (s: PoleStatus) => void;
}) {
  const rows: { status: PoleStatus; badge: ValidationStatus }[] = [
    { status: 'pass',       badge: 'pass' },
    { status: 'warning',    badge: 'warning' },
    { status: 'fail',       badge: 'fail' },
    { status: 'unverified', badge: 'pending' },
  ];
  return (
    <div className="flex flex-col gap-2 w-[160px]">
      <div className="border-b border-neutral-200 px-2 pb-2">
        <p className="text-base font-medium text-[#0a0a0a]">Filter by</p>
      </div>
      <div className="flex flex-col">
        {rows.map(({ status, badge }) => {
          const checked = active.has(status);
          return (
            <button
              key={status}
              onClick={() => onToggle(status)}
              className={cn(
                'flex items-center gap-2 min-h-8 px-2 py-1.5 rounded-md text-left transition-colors',
                checked ? 'bg-[#f5f5f5]' : 'hover:bg-[#f5f5f5]'
              )}
            >
              <span className="flex items-center justify-center w-5 shrink-0">
                <Checkbox checked={checked} className="pointer-events-none" />
              </span>
              <ValidationBadge
                status={badge}
                count={counts[status]}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Collapsed rail ───────────────────────────────────────────────────────────
function CollapsedRail({
  onExpand,
  onExpandToSection,
}: {
  onExpand: () => void;
  onExpandToSection: (section: 'create' | 'rules' | 'results' | 'history') => void;
}) {
  const railBtn =
    'flex items-center justify-center w-full h-10 text-white hover:bg-white/10 transition-colors border-b border-[#f7f9fc]/30 shrink-0';
  return (
    <aside
      className="flex flex-col w-11 shrink-0 h-full"
      style={{ background: '#363687' }}
    >
      {/* Expand toggle */}
      <button className={railBtn} onClick={onExpand} title="Expand panel">
        <ArrowRightFromLine size={20} />
      </button>

      {/* Poles (utility-pole) */}
      <button className={railBtn} onClick={onExpand} title="Poles">
        <UtilityPole size={20} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Section icons */}
      <button className={railBtn} onClick={() => onExpandToSection('create')} title="Create Version">
        <Wand2 size={20} />
      </button>
      <button className={railBtn} onClick={() => onExpandToSection('rules')} title="Rules & Templates">
        <BookMarked size={20} />
      </button>
      <button className={railBtn} onClick={() => onExpandToSection('results')} title="Results">
        <CheckCircle size={20} />
      </button>
      <button
        className={cn(railBtn, 'border-b-0')}
        onClick={() => onExpandToSection('history')}
        title="History"
      >
        <History size={20} />
      </button>
    </aside>
  );
}

// ─── Version tree ─────────────────────────────────────────────────────────────
const VERSION_STATUS: Record<VersionStatus, { color: string; label: string }> = {
  unverified: { color: 'bg-[#9ea2aa]', label: 'Unverified' },
  passed:     { color: 'bg-[#1fa163]', label: 'Passed' },
  warnings:   { color: 'bg-[#eab308]', label: 'Warnings' },
  failing:    { color: 'bg-[#dc2626]', label: 'Failing' },
};

interface TreeNode { set: DesignSet; depth: number }

// Flatten the design sets into a depth-ordered list following parentId links.
function buildVersionOrder(sets: DesignSet[]): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (parentId: string | undefined, depth: number) => {
    for (const set of sets.filter(s => (s.parentId ?? undefined) === parentId)) {
      out.push({ set, depth });
      walk(set.id, depth + 1);
    }
  };
  walk(undefined, 0);
  // Safety net: surface any orphaned versions whose parent was removed.
  for (const set of sets) {
    if (!out.some(n => n.set.id === set.id)) out.push({ set, depth: 0 });
  }
  return out;
}

function VersionMenuItem({
  icon: Icon, label, onClick, danger = false,
}: {
  icon: typeof Copy; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 min-h-8 px-2 py-1.5 rounded-md text-left hover:bg-[#f5f5f5] transition-colors',
        danger ? 'text-[#dc2626]' : 'text-[#0a0a0a]',
      )}
    >
      <Icon size={15} className={cn('shrink-0', danger ? 'text-[#dc2626]' : 'text-[#0a0a0a]')} />
      <span className="text-sm whitespace-nowrap">{label}</span>
    </button>
  );
}

function VersionRowMenu({
  set, isActive, onSetActive, onRename, onDelete, onCreateFrom,
}: {
  set: DesignSet;
  isActive: boolean;
  onSetActive: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCreateFrom: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={e => e.stopPropagation()}
        className={cn(
          'shrink-0 flex items-center justify-center w-5 h-5 rounded hover:bg-black/10 transition-opacity',
          open ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <MoreVertical size={16} className="text-[#3c404d]" />
      </PopoverTrigger>
      <PopoverContent align="start" side="right" sideOffset={4} className="w-[210px] p-1">
        <div className="flex flex-col">
          {!isActive && <VersionMenuItem icon={Check} label="Set as active" onClick={() => { setOpen(false); onSetActive(); }} />}
          <VersionMenuItem icon={GitBranchPlus} label="Create version from this" onClick={() => { setOpen(false); onCreateFrom(); }} />
          {!set.isOriginal && <VersionMenuItem icon={SquarePen} label="Rename" onClick={() => { setOpen(false); onRename(); }} />}
          {!set.isOriginal && <VersionMenuItem icon={Trash2} label="Delete" danger onClick={() => { setOpen(false); onDelete(); }} />}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function VersionTree({
  designSets, activeId, viewedId, onSelect, onSetActive, onRename, onDelete, onCreateFrom,
}: {
  designSets: DesignSet[];
  activeId: string;
  viewedId: string;
  onSelect: (id: string) => void;
  onSetActive: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCreateFrom: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const nodes = buildVersionOrder(designSets);

  const commitRename = () => {
    if (renamingId && renameValue.trim()) onRename(renamingId, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <div className="shrink-0 border-b border-neutral-200 bg-white">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 w-full px-3 h-9 text-left hover:bg-neutral-50 transition-colors"
      >
        <ChevronDown size={15} className={cn('text-neutral-400 transition-transform', open ? '' : '-rotate-90')} />
        <FolderGit2 size={15} className="text-[#363687] shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 flex-1">Versions</span>
        <span className="text-[11px] text-neutral-400">{designSets.length}</span>
      </button>

      {open && (
        <div className="max-h-[34vh] overflow-y-auto pb-1">
          {nodes.map(({ set, depth }) => {
            const active = set.id === activeId;
            const viewed = set.id === viewedId;
            const status = getVersionStatus(set);
            const renaming = renamingId === set.id;
            return (
              <div
                key={set.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(set.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(set.id); } }}
                className={cn(
                  'group flex items-center gap-1.5 h-8 pr-1.5 text-left transition-colors cursor-pointer border-l-2',
                  viewed ? 'bg-[rgba(54,54,135,0.1)] border-[#363687]' : 'border-transparent hover:bg-neutral-50',
                )}
                style={{ paddingLeft: 10 + depth * 16 }}
              >
                {set.isOriginal
                  ? <Lock size={13} className="text-neutral-400 shrink-0" />
                  : <GitBranchPlus size={13} className="text-neutral-400 shrink-0" />}

                <span
                  className={cn('w-2 h-2 rounded-full shrink-0', VERSION_STATUS[status].color)}
                  title={VERSION_STATUS[status].label}
                />

                {renaming ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    className="flex-1 min-w-0 h-6 px-1.5 text-sm rounded border border-[#363687] bg-white text-[#3c404d] outline-none"
                  />
                ) : (
                  <span className={cn('flex-1 min-w-0 text-sm truncate', viewed ? 'text-[#363687] font-medium' : 'text-[#3c404d]')}>
                    {set.name}
                  </span>
                )}

                {active && !renaming && (
                  <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold text-white bg-[#1fa163] rounded-full px-1.5 py-px">
                    <Check size={10} /> Active
                  </span>
                )}

                {!renaming && (
                  <VersionRowMenu
                    set={set}
                    isActive={active}
                    onSetActive={() => onSetActive(set.id)}
                    onRename={() => { setRenamingId(set.id); setRenameValue(set.name); }}
                    onDelete={() => onDelete(set.id)}
                    onCreateFrom={() => onCreateFrom(set.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────
export function LeftSidebar({
  poles, selectedPoleId, onSelectPole,
  designSets, activeDesignSetId, viewedDesignSetId, canCreateVariant, baseReadOnly,
  onSelectVersion, onSetActiveVersion, onCreateVersion, onCreateVariants,
  onPromoteVariant, onRenameVariant, onDeleteVariant, canPromoteVariant,
  onRenameVersion, onDeleteVersion, onRunValidation,
  ruleSets, lastRun, runHistory, jobName,
}: LeftSidebarProps) {
  const [collapsed, setCollapsed]       = useState(false);
  const [search, setSearch]             = useState('');
  const [showSearch, setShowSearch]     = useState(false);
  const [createOpen, setCreateOpen]     = useState(false);
  const [rulesOpen, setRulesOpen]       = useState(false);
  const [resultsOpen, setResultsOpen]   = useState(false);
  const [historyOpen, setHistoryOpen]   = useState(false);
  const [sortBy, setSortBy]             = useState<SortOption>('last-modified');
  const [statusFilters, setStatusFilters] = useState<Set<PoleStatus>>(new Set());
  const [bulkMode, setBulkMode]         = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [collapsedPoles, setCollapsedPoles] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setCollapsedPoles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const viewedSet = designSets.find(d => d.id === viewedDesignSetId) ?? designSets[0];

  // "Create version from this node" — view it first so the new version
  // branches from it, then open the dialog.
  const handleCreateFromVersion = (id: string) => {
    onSelectVersion(id);
    setCreateOpen(true);
  };

  // Counts per status across all poles (for the filter flyout badges)
  const statusCounts = poles.reduce<Record<PoleStatus, number>>(
    (acc, p) => { acc[getPoleStatus(p)]++; return acc; },
    { pass: 0, warning: 0, fail: 0, unverified: 0 }
  );

  const toggleStatusFilter = (s: PoleStatus) => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const filteredPoles = poles
    .filter(p => p.poleNumber.toLowerCase().includes(search.toLowerCase()))
    .filter(p => statusFilters.size === 0 || statusFilters.has(getPoleStatus(p)))
    .slice()
    .sort((a, b) => {
      switch (sortBy) {
        case 'validation-fail-pass':
          return STATUS_RANK[getPoleStatus(a)] - STATUS_RANK[getPoleStatus(b)];
        case 'validation-pass-fail':
          return STATUS_RANK[getPoleStatus(b)] - STATUS_RANK[getPoleStatus(a)];
        case 'collected-at':
          return a.taggedDate.localeCompare(b.taggedDate);
        case 'last-modified':
        default:
          return 0;
      }
    });

  const allFilteredSelected = filteredPoles.length > 0 && filteredPoles.every(p => bulkSelected.has(p.id));
  const someSelected = filteredPoles.some(p => bulkSelected.has(p.id));

  const toggleBulkPole = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setBulkSelected(prev => {
      if (filteredPoles.length > 0 && filteredPoles.every(p => prev.has(p.id))) {
        return new Set();
      }
      return new Set(filteredPoles.map(p => p.id));
    });
  };

  const enterBulkMode = () => setBulkMode(true);
  const exitBulkMode = () => { setBulkMode(false); setBulkSelected(new Set()); };

  const expandToSection = (section: 'create' | 'rules' | 'results' | 'history') => {
    setCollapsed(false);
    setCreateOpen(section === 'create');
    setRulesOpen(section === 'rules');
    setResultsOpen(section === 'results');
    setHistoryOpen(section === 'history');
  };

  if (collapsed) {
    return (
      <CollapsedRail
        onExpand={() => setCollapsed(false)}
        onExpandToSection={expandToSection}
      />
    );
  }

  return (
    <aside className="flex flex-col w-[320px] shrink-0 border-r border-neutral-200 overflow-hidden h-full">

      {/* ── Header ── */}
      <div
        className="flex items-center gap-2 px-3 h-12 shrink-0 border-b border-[#f7f9fc]"
        style={{ background: '#363687' }}
      >
        <span className="font-barlow font-semibold text-white text-base flex-1 leading-none">
          {jobName}
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-white hover:text-white/70 transition-colors shrink-0"
          title="Collapse panel"
        >
          <ArrowLeftFromLine size={20} />
        </button>
      </div>

      {/* ── Version hierarchy ── */}
      <VersionTree
        designSets={designSets}
        activeId={activeDesignSetId}
        viewedId={viewedDesignSetId}
        onSelect={onSelectVersion}
        onSetActive={onSetActiveVersion}
        onRename={onRenameVersion}
        onDelete={onDeleteVersion}
        onCreateFrom={handleCreateFromVersion}
      />

      {/* ── Viewed version label ── */}
      <div className="flex items-center gap-1.5 px-3 h-7 shrink-0 bg-[#f4f3fb] border-b border-neutral-200">
        <span className="text-[11px] text-neutral-500 truncate">
          Viewing <span className="font-semibold text-[#363687]">{viewedSet?.name}</span>
          {baseReadOnly && <span className="text-neutral-400"> · read-only</span>}
          {viewedDesignSetId === activeDesignSetId && <span className="text-[#1fa163]"> · active</span>}
        </span>
      </div>

      {/* ── Nav / Toolbar ── */}
      <div
        className="flex items-center gap-2 px-3 h-12 shrink-0 border-b border-[#f7f9fc]"
        style={{ background: '#363687' }}
      >
        {/* Left controls */}
        {!bulkMode ? (
          <button
            onClick={enterBulkMode}
            className="text-white hover:text-white/70 transition-colors shrink-0"
            title="Bulk edit"
          >
            <LayoutList size={24} />
          </button>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            {/* Select all */}
            <Checkbox
              checked={allFilteredSelected}
              indeterminate={someSelected && !allFilteredSelected}
              onCheckedChange={toggleSelectAll}
              className="border-white data-unchecked:bg-white/10"
              title="Select all"
            />
            {/* Bulk action — create a version of each selected pole (as children).
                Never creates a new full set in the top tree. */}
            {bulkSelected.size > 0 && canCreateVariant && (
              <button
                onClick={() => {
                  onCreateVariants(Array.from(bulkSelected));
                  exitBulkMode();
                }}
                className="flex items-center gap-1 h-7 pl-2 pr-2.5 rounded-full bg-white border border-[#e5e5e5] text-[#2a2f3c] text-xs font-medium hover:bg-neutral-100 transition-colors"
                title="Create a version of each selected pole (nested under each pole)"
              >
                <GitBranchPlus size={13} />
                Create version ({bulkSelected.size})
              </button>
            )}
            {/* Exit bulk mode */}
            <button
              onClick={exitBulkMode}
              className="text-white hover:text-white/70 transition-colors"
              title="Exit bulk edit"
            >
              <List size={24} />
            </button>
          </div>
        )}

        {/* Inline search field (fills the middle when active) */}
        {showSearch && (
          <div className="flex-1 flex items-center gap-1.5 bg-white rounded-md border border-neutral-200 px-2 h-8 min-w-0">
            <Search size={15} className="text-neutral-400 shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search poles…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-0 text-sm bg-transparent outline-none text-neutral-700 placeholder:text-neutral-400"
            />
            <button
              onClick={() => { setSearch(''); setShowSearch(false); }}
              className="text-neutral-400 hover:text-neutral-600 shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Standalone search icon — hidden while the field is open */}
          {!showSearch && (
            <button
              onClick={() => setShowSearch(true)}
              className="text-white hover:text-white/70 transition-colors"
              title="Search"
            >
              <Search size={24} />
            </button>
          )}

          {/* Sort flyout */}
          <Popover>
            <PopoverTrigger
              className="text-white hover:text-white/70 transition-colors"
              title="Sort"
            >
              <ArrowUpDown size={24} />
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={6} className="w-auto p-2">
              <SortFlyout value={sortBy} onChange={setSortBy} />
            </PopoverContent>
          </Popover>

          {/* Filter flyout */}
          <Popover>
            <PopoverTrigger
              className="text-white hover:text-white/70 transition-colors relative"
              title="Filter"
            >
              <ListFilter size={24} />
              {statusFilters.size > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
              )}
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={6} className="w-auto p-2">
              <FilterFlyout
                counts={statusCounts}
                active={statusFilters}
                onToggle={toggleStatusFilter}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Pole list (with nested pole versions) ── */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {filteredPoles.map(pole => {
          const variants = pole.variants ?? [];
          const hasVariants = variants.length > 0;
          const expanded = hasVariants && !collapsedPoles.has(pole.id);
          const variantPassed =
            getPoleStatus(pole) !== 'pass' && variants.some(v => getPoleStatus(v) === 'pass');
          return (
            <div key={pole.id}>
              <PoleListItem
                pole={pole}
                selected={pole.id === selectedPoleId}
                onClick={() => onSelectPole(pole.id)}
                bulkMode={bulkMode}
                checked={bulkSelected.has(pole.id)}
                onToggleCheck={() => toggleBulkPole(pole.id)}
                hasVariants={hasVariants}
                expanded={expanded}
                onToggleExpand={() => toggleCollapse(pole.id)}
                canEdit={canCreateVariant}
                variantPassed={variantPassed}
                onAction={action => {
                  if (action === 'create-variant') onCreateVariants([pole.id]);
                }}
              />
              {expanded && variants.map(v => (
                <VariantListItem
                  key={v.id}
                  variant={v}
                  selected={v.id === selectedPoleId}
                  onClick={() => onSelectPole(v.id)}
                  canPromote={canPromoteVariant}
                  onMakeActive={() => onPromoteVariant(v.id)}
                  onRename={name => onRenameVariant(v.id, name)}
                  onDelete={() => onDeleteVariant(v.id)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* ── Bottom action buttons ── */}
      <div className="shrink-0 flex flex-col gap-1 p-2" style={{ background: '#363687' }}>

        {/* Create Version — opens a centered dialog */}
        <button
          onClick={() => setCreateOpen(true)}
          className={actionButtonClass(createOpen)}
        >
          <span className="shrink-0 flex items-center"><Wand2 size={20} /></span>
          <span className="flex-1 min-w-0 text-sm font-medium leading-5 truncate text-left">Create Version</span>
        </button>

        {/* Rules & Templates */}
        <SidebarActionButton
          icon={<BookMarked size={20} />}
          label="Rules & Templates"
          open={rulesOpen}
          onOpenChange={setRulesOpen}
        >
          <RulesBody
            ruleSets={ruleSets}
            onRun={id => { onRunValidation(id); }}
            onManage={() => setRulesOpen(false)}
          />
        </SidebarActionButton>

        {/* Results */}
        <SidebarActionButton
          icon={<CheckCircle size={20} />}
          label="Results"
          open={resultsOpen}
          onOpenChange={setResultsOpen}
        >
          {lastRun
            ? <ResultsBody lastRun={lastRun} />
            : <div className="bg-white px-3 py-3"><p className="text-[11px] text-neutral-400">No results yet — run a rule set to see validation results.</p></div>}
        </SidebarActionButton>

        {/* History */}
        <SidebarActionButton
          icon={<History size={20} />}
          label="History"
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        >
          <HistoryBody runs={runHistory ?? (lastRun ? [lastRun] : [])} />
        </SidebarActionButton>
      </div>

      {/* Create Version dialog (centered) */}
      <CreateDesignDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={meta => onCreateVersion(meta)}
        sourceLabel={viewedSet?.name}
      />
    </aside>
  );
}
