import { useState, useRef, useEffect } from 'react';
import {
  Search, ArrowUpDown, ListFilter, X,
  ArrowLeftFromLine, ArrowRightFromLine,
  BookMarked, History, Play,
  MoreVertical, UtilityPole,
  Circle, CircleCheck, CircleX, CircleAlert,
  SquarePen, Pencil, Upload,
  ChevronDown, ChevronRight, Lock, GitBranchPlus, Trash2, FolderGit2, Check, BadgeCheck,
} from 'lucide-react';
import type {
  Pole, DesignSet, RuleSet, ValidationStatus, VersionStatus,
  ValidationRun, PublishEvent,
} from '../../types';
import { ValidationBadge } from '../ui/ValidationBadge';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { CreateDesignDialog, type VersionFormMeta } from './CreateDesignDialog';
import { BulkEditDialog } from './BulkEditDialog';
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
  onDeselectPole: () => void;
  onEditPoleProperties: (poleId: string) => void;
  onRenamePole: (poleId: string, name: string) => void;
  designSets: DesignSet[];
  activeDesignSetId: string;
  viewedDesignSetId: string;
  /** Poles in this view aren't directly editable (imported or non-active). */
  baseReadOnly: boolean;
  onSelectVersion: (id: string) => void;
  onSetActiveVersion: (id: string) => void;
  onCreateVersion: (meta: VersionFormMeta) => void;
  onBulkEdit: (poleIds: string[], patch: Partial<Pole>) => void;
  onRenameVersion: (id: string, name: string) => void;
  onDeleteVersion: (id: string) => void;
  onPublishVersion: (id: string) => void;
  onRunValidation: (ruleSetId: string) => void;
  ruleSets: RuleSet[];
  runHistory?: ValidationRun[];
  publishHistory?: PublishEvent[];
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
type PoleAction = 'edit-properties' | 'rename';

const POLE_MENU_ITEMS: { id: PoleAction; label: string; icon: typeof SquarePen }[] = [
  { id: 'edit-properties', label: 'Edit properties', icon: SquarePen },
  { id: 'rename',          label: 'Rename',          icon: Pencil },
];

function ItemFlyout({ onAction, canEdit = true }: { onAction: (a: PoleAction) => void; canEdit?: boolean }) {
  return (
    <div className="flex flex-col w-[180px]">
      {POLE_MENU_ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={e => { e.stopPropagation(); onAction(id); }}
          disabled={!canEdit}
          title={canEdit ? undefined : 'This version is read-only'}
          className="flex items-center gap-2 min-h-8 px-2 py-1.5 rounded-md text-left hover:bg-[#f5f5f5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
        >
          <Icon size={16} className="text-[#0a0a0a] shrink-0" />
          <span className="text-sm text-[#0a0a0a] whitespace-nowrap">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Pole list row ────────────────────────────────────────────────────────────
function PoleListItem({
  pole, selected, onClick, onEditProperties, onRename, canEdit = true,
  checked = false, onToggleCheck,
}: {
  pole: Pole;
  selected: boolean;
  onClick: () => void;
  onEditProperties: () => void;
  onRename: (name: string) => void;
  canEdit?: boolean;
  checked?: boolean;
  onToggleCheck?: () => void;
}) {
  const status = getPoleStatus(pole);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(pole.poleNumber);
  const inputRef = useRef<HTMLInputElement>(null);
  // While the menu is closing it returns focus to its trigger, which can blur
  // the freshly-mounted input. Ignore blur during this brief settle window.
  const settlingRef = useRef(false);

  const startRename = () => {
    setDraft(pole.poleNumber);
    setRenaming(true);
  };

  // Focus + select the field when it appears, and arm the blur guard.
  useEffect(() => {
    if (!renaming) return;
    settlingRef.current = true;
    inputRef.current?.focus();
    inputRef.current?.select();
    const t = window.setTimeout(() => { settlingRef.current = false; }, 300);
    return () => window.clearTimeout(t);
  }, [renaming]);

  const commitRename = () => {
    const next = draft.trim();
    if (next && next !== pole.poleNumber) onRename(next);
    setRenaming(false);
  };

  const cancelRename = () => {
    setDraft(pole.poleNumber);
    setRenaming(false);
  };

  const handleAction = (a: PoleAction) => {
    setMenuOpen(false);
    if (a === 'edit-properties') onEditProperties();
    else if (a === 'rename') startRename();
  };

  return (
    <div className="pr-2 py-0.5 bg-white flex items-center gap-2 pl-3">
      {/* Persistent select checkbox — outside the card */}
      <Checkbox
        checked={checked}
        onCheckedChange={() => onToggleCheck?.()}
        className="shrink-0"
      />

      <div
        role="button"
        tabIndex={0}
        onClick={renaming ? undefined : onClick}
        onKeyDown={e => { if (!renaming && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
        className={cn(
          'flex-1 min-w-0 flex items-center gap-1 h-8 pr-1 py-1 pl-2 rounded-[4px] text-left transition-colors group relative',
          renaming ? 'cursor-default' : 'cursor-pointer',
          selected
            ? 'bg-[rgba(255,167,14,0.1)] border border-[rgba(255,167,14,0.5)]'
            : 'border border-transparent hover:bg-[rgba(255,167,14,0.1)]'
        )}
      >
        {/* Status indicator */}
        <PoleStatusIndicator status={status} />

        {/* Pole number — inline rename input when renaming */}
        {renaming ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onClick={e => e.stopPropagation()}
            onBlur={() => {
              // Ignore the focus-restore blur fired while the menu is closing.
              if (settlingRef.current) {
                inputRef.current?.focus();
                return;
              }
              commitRename();
            }}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === 'Enter') commitRename();
              else if (e.key === 'Escape') cancelRename();
            }}
            className="font-barlow text-sm flex-1 min-w-0 bg-white text-[#3c404d] border border-[rgba(255,167,14,0.8)] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[rgba(255,167,14,0.8)]"
          />
        ) : (
          <span className="font-barlow text-sm flex-1 text-left truncate text-[#3c404d]">
            {pole.poleNumber}
          </span>
        )}

        {/* Date */}
        {!renaming && (
          <span className="font-barlow text-xs text-[#9ea2aa] shrink-0 text-right whitespace-nowrap">
            {pole.taggedDate}
          </span>
        )}

        {/* Kebab */}
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
            <PopoverContent align="start" side="right" sideOffset={4} className="w-auto p-1">
              <ItemFlyout onAction={handleAction} canEdit={canEdit} />
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

// ─── History flyout: unified log of rule runs + publishes ─────────────────────

// A rule-run entry. Collapsed by default; expands to show the run's results.
function RunHistoryItem({ run }: { run: ValidationRun }) {
  const [expanded, setExpanded] = useState(false);
  const s = run.summary;
  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center gap-2 py-2 px-1 -mx-1 rounded text-left hover:bg-neutral-50 transition-colors"
      >
        <ChevronRight
          size={14}
          className={cn('shrink-0 text-neutral-400 transition-transform', expanded && 'rotate-90')}
        />
        <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#363687]/10 text-[#363687]">
          <Play size={13} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#2a2f3c] truncate">Ran {run.ruleSetName}</p>
          <p className="text-[11px] text-neutral-400">{new Date(run.runAt).toLocaleString()}</p>
        </div>
        <span className="text-xs text-neutral-500 shrink-0">{s.total} poles</span>
      </button>

      {expanded && (
        <div className="pb-3 pl-9 pr-1 space-y-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <ValidationBadge status="pass"    count={s.pass}    size="md" />
            <ValidationBadge status="warning" count={s.warning} size="md" />
            <ValidationBadge status="review"  count={s.review}  size="md" />
            <ValidationBadge status="fail"    count={s.fail}    size="md" />
          </div>
          <Separator />
          <p className="text-xs font-semibold text-neutral-700">Rule Breakdown</p>
          {[
            { label: 'Comm to LCE Clearance', pass: s.pass, total: s.total },
            { label: 'Ground Clearance',       pass: Math.round(s.pass * 0.9), total: s.total },
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
      )}
    </div>
  );
}

// A publish entry — a simple log line.
function PublishHistoryItem({ event }: { event: PublishEvent }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-neutral-100 last:border-0">
      <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[#1d4ed8]/10 text-[#1d4ed8] ml-[22px]">
        <Upload size={13} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#2a2f3c] truncate">Published to IKE Office Pro</p>
        <p className="text-[11px] text-neutral-400">{new Date(event.publishedAt).toLocaleString()}</p>
      </div>
      {event.hadFailures && (
        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-[#dc2626]">
          <CircleAlert size={12} /> with failures
        </span>
      )}
    </div>
  );
}

type HistoryEntry =
  | { kind: 'run'; at: number; run: ValidationRun }
  | { kind: 'publish'; at: number; event: PublishEvent };

function HistoryBody({
  runs, publishes,
}: {
  runs: ValidationRun[];
  publishes: PublishEvent[];
}) {
  const entries: HistoryEntry[] = [
    ...runs.map(r => ({ kind: 'run' as const, at: new Date(r.runAt).getTime(), run: r })),
    ...publishes.map(p => ({ kind: 'publish' as const, at: new Date(p.publishedAt).getTime(), event: p })),
  ].sort((a, b) => b.at - a.at);

  return (
    <div className="bg-white px-3 py-3">
      <p className="text-sm font-semibold text-[#2a2f3c] pb-1">History</p>
      {entries.length === 0 ? (
        <p className="text-[11px] text-neutral-400">
          No activity yet — run rules or publish a version to see it logged here.
        </p>
      ) : (
        <div>
          {entries.map(e =>
            e.kind === 'run'
              ? <RunHistoryItem key={e.run.id} run={e.run} />
              : <PublishHistoryItem key={e.event.id} event={e.event} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Rule / template flyout row (hover reveals Run + Make default) ────────────
function RuleFlyoutItem({
  name, meta, isDefault, onRun, onMakeDefault,
}: {
  name: string;
  meta: string;
  isDefault: boolean;
  onRun: () => void;
  onMakeDefault: () => void;
}) {
  return (
    <div className="group flex items-start gap-2 px-3 py-2 hover:bg-neutral-50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#2a2f3c]">{name}</p>
        <p className="text-[11px] text-neutral-400 mt-0.5">{meta}</p>
      </div>
      <div className="relative flex items-center gap-1.5 shrink-0">
        {/* Make default floats over the title on hover — no reserved space, no reflow */}
        {!isDefault && (
          <button
            onClick={onMakeDefault}
            className="absolute right-full mr-1.5 top-1/2 -translate-y-1/2 h-6 px-2.5 text-xs font-medium rounded-full border border-neutral-300 bg-white text-[#2a2f3c] shadow-sm hover:bg-neutral-100 whitespace-nowrap opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          >
            Make default
          </button>
        )}
        {isDefault && (
          <span className="inline-flex items-center gap-1 h-6 px-2.5 text-xs font-semibold text-[#1fa163] bg-[#1fa163]/12 rounded-full">
            <Check size={12} /> Default
          </span>
        )}
        <Button
          size="sm"
          className="h-6 px-2.5 text-xs bg-[#2a2f3c] hover:bg-[#1a1f2c] text-white rounded-full"
          onClick={onRun}
        >
          Run
        </Button>
      </div>
    </div>
  );
}

// ─── Rules & Templates section body ──────────────────────────────────────────
const DEMO_TEMPLATES = [
  { id: 't-1', name: 'Utility Pole Height Validation', date: '04/09/26', count: 2 },
  { id: 't-2', name: 'Utility Pole Height Validation - v2', date: '04/10/26', count: 2 },
];

function RulesBody({
  ruleSets, defaultRuleId, onRun, onMakeDefault, onManage,
}: {
  ruleSets: RuleSet[];
  defaultRuleId: string;
  onRun: (id: string) => void;
  onMakeDefault: (id: string, name: string) => void;
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
          <RuleFlyoutItem
            name={rs.name}
            meta={`${rs.rules.length} rules · ${rs.createdAt}`}
            isDefault={rs.id === defaultRuleId}
            onRun={() => onRun(rs.id)}
            onMakeDefault={() => onMakeDefault(rs.id, rs.name)}
          />
        </div>
      ))}

      <Separator className="my-1" />

      {/* Templates group (static demo) */}
      <div className="px-3 pt-1 pb-1">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          Templates <span className="font-normal normal-case">{DEMO_TEMPLATES.length}</span>
        </p>
      </div>
      {DEMO_TEMPLATES.map((t, i) => (
        <div key={t.id}>
          {i > 0 && <Separator />}
          <RuleFlyoutItem
            name={t.name}
            meta={`${t.count} rules · ${t.date}`}
            isDefault={t.id === defaultRuleId}
            onRun={() => onRun(t.id)}
            onMakeDefault={() => onMakeDefault(t.id, t.name)}
          />
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
  onExpandToSection: (section: 'rules' | 'history') => void;
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
      <button className={railBtn} onClick={() => onExpandToSection('rules')} title="Rules & Templates">
        <BookMarked size={20} />
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

// Blue "published" indicator with a fixed-position tooltip (escapes sidebar clip).
function PublishedBadge() {
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null);
  return (
    <>
      <span
        className="shrink-0 flex items-center"
        onMouseEnter={e => {
          const r = e.currentTarget.getBoundingClientRect();
          setTip({ top: r.top - 8, left: r.left + r.width / 2 });
        }}
        onMouseLeave={() => setTip(null)}
      >
        <BadgeCheck size={15} className="text-[#1d4ed8]" />
      </span>
      {tip && (
        <div
          style={{ position: 'fixed', top: tip.top, left: tip.left, transform: 'translate(-50%, -100%)' }}
          className="pointer-events-none z-[80] whitespace-nowrap rounded-md bg-[#2a2f3c] px-2 py-1 text-xs text-white shadow-lg"
        >
          Published
        </div>
      )}
    </>
  );
}

function VersionMenuItem({
  icon: Icon, label, onClick, danger = false,
}: {
  icon: typeof SquarePen; label: string; onClick: () => void; danger?: boolean;
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
  set, isActive, onSetActive, onRename, onDelete, onCreateFrom, onPublish,
}: {
  set: DesignSet;
  isActive: boolean;
  onSetActive: () => void;
  onRename: () => void;
  onDelete: () => void;
  onCreateFrom: () => void;
  onPublish: () => void;
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
          <VersionMenuItem icon={Upload} label="Publish" onClick={() => { setOpen(false); onPublish(); }} />
          {!set.isOriginal && <VersionMenuItem icon={SquarePen} label="Rename" onClick={() => { setOpen(false); onRename(); }} />}
          {!set.isOriginal && <VersionMenuItem icon={Trash2} label="Delete" danger onClick={() => { setOpen(false); onDelete(); }} />}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function VersionTree({
  designSets, activeId, viewedId, onSelect, onSetActive, onRename, onDelete, onCreateFrom, onPublish,
}: {
  designSets: DesignSet[];
  activeId: string;
  viewedId: string;
  onSelect: (id: string) => void;
  onSetActive: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onCreateFrom: (id: string) => void;
  onPublish: (id: string) => void;
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

                {set.published && !renaming && <PublishedBadge />}

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
                    onPublish={() => onPublish(set.id)}
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
  poles, selectedPoleId, onSelectPole, onDeselectPole, onEditPoleProperties, onRenamePole,
  designSets, activeDesignSetId, viewedDesignSetId, baseReadOnly,
  onSelectVersion, onSetActiveVersion, onCreateVersion, onBulkEdit,
  onRenameVersion, onDeleteVersion, onPublishVersion, onRunValidation,
  ruleSets, runHistory, publishHistory, jobName,
}: LeftSidebarProps) {
  const [collapsed, setCollapsed]       = useState(false);
  const [search, setSearch]             = useState('');
  const [showSearch, setShowSearch]     = useState(false);
  const [createOpen, setCreateOpen]     = useState(false);
  const [rulesOpen, setRulesOpen]       = useState(false);
  const [historyOpen, setHistoryOpen]   = useState(false);
  const [sortBy, setSortBy]             = useState<SortOption>('last-modified');
  const [statusFilters, setStatusFilters] = useState<Set<PoleStatus>>(new Set());
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [defaultRule, setDefaultRule] = useState<{ id: string; name: string }>(
    () => ruleSets[0] ? { id: ruleSets[0].id, name: ruleSets[0].name } : { id: '', name: '' }
  );
  const [defaultTip, setDefaultTip] = useState<{ top: number; left: number } | null>(null);

  const viewedSet = designSets.find(d => d.id === viewedDesignSetId) ?? designSets[0];
  const bulkReadOnlyReason: 'original' | 'inactive' | null =
    baseReadOnly ? (viewedDesignSetId !== activeDesignSetId ? 'inactive' : 'original') : null;

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

  const handleApplyBulkEdit = (patch: Partial<Pole>) => {
    onBulkEdit(Array.from(bulkSelected), patch);
    setBulkSelected(new Set());
  };

  const expandToSection = (section: 'rules' | 'history') => {
    setCollapsed(false);
    setRulesOpen(section === 'rules');
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
        onPublish={onPublishVersion}
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
        {/* Left controls — persistent select-all + bulk edit */}
        <div className="flex items-center gap-2 shrink-0">
          <Checkbox
            checked={allFilteredSelected}
            indeterminate={someSelected && !allFilteredSelected}
            onCheckedChange={toggleSelectAll}
            className="border-white data-unchecked:bg-white/10"
            title="Select all"
          />
          {bulkSelected.size > 0 && (
            <button
              onClick={() => setBulkEditOpen(true)}
              className="flex items-center gap-1 h-7 pl-2 pr-2.5 rounded-full bg-white border border-[#e5e5e5] text-[#2a2f3c] text-xs font-medium hover:bg-neutral-100 transition-colors"
              title="Bulk edit selected poles"
            >
              <SquarePen size={13} />
              Bulk edit ({bulkSelected.size})
            </button>
          )}
        </div>

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

      {/* ── Pole list ── */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {filteredPoles.map(pole => (
          <PoleListItem
            key={pole.id}
            pole={pole}
            selected={pole.id === selectedPoleId}
            onClick={() => (pole.id === selectedPoleId ? onDeselectPole() : onSelectPole(pole.id))}
            onEditProperties={() => onEditPoleProperties(pole.id)}
            onRename={name => onRenamePole(pole.id, name)}
            canEdit={!baseReadOnly}
            checked={bulkSelected.has(pole.id)}
            onToggleCheck={() => toggleBulkPole(pole.id)}
          />
        ))}
      </div>

      {/* ── Bottom action buttons ── */}
      <div className="shrink-0 flex flex-col gap-1 p-2" style={{ background: '#363687' }}>

        {/* Run default rules — single click; tooltip shows the default on hover */}
        <button
          onClick={() => { if (defaultRule.id) onRunValidation(defaultRule.id); }}
          disabled={!defaultRule.id}
          onMouseEnter={e => {
            const r = e.currentTarget.getBoundingClientRect();
            setDefaultTip({ top: r.top + r.height / 2, left: r.right + 8 });
          }}
          onMouseLeave={() => setDefaultTip(null)}
          className={cn(actionButtonClass(false), !defaultRule.id && 'opacity-50 cursor-not-allowed')}
        >
          <span className="shrink-0 flex items-center"><Play size={18} /></span>
          <span className="flex-1 min-w-0 text-sm font-medium leading-5 truncate text-left">Run default rules</span>
        </button>
        {defaultTip && (
          <div
            style={{ position: 'fixed', top: defaultTip.top, left: defaultTip.left, transform: 'translateY(-50%)' }}
            className="pointer-events-none z-[60] whitespace-nowrap rounded-md bg-[#2a2f3c] px-2.5 py-1.5 text-xs text-white shadow-lg"
          >
            <span className="text-white/60">Default: </span>
            {defaultRule.name || 'No default rule set'}
          </div>
        )}

        {/* Rules & Templates flyout */}
        <SidebarActionButton
          icon={<BookMarked size={20} />}
          label="Rules & Templates"
          open={rulesOpen}
          onOpenChange={setRulesOpen}
        >
          <RulesBody
            ruleSets={ruleSets}
            defaultRuleId={defaultRule.id}
            onRun={id => { onRunValidation(id); setRulesOpen(false); }}
            onMakeDefault={(id, name) => setDefaultRule({ id, name })}
            onManage={() => setRulesOpen(false)}
          />
        </SidebarActionButton>

        {/* History — unified log of rule runs and publishes */}
        <SidebarActionButton
          icon={<History size={20} />}
          label="History"
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        >
          <HistoryBody runs={runHistory ?? []} publishes={publishHistory ?? []} />
        </SidebarActionButton>
      </div>

      {/* Create Version dialog (centered) */}
      <CreateDesignDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={meta => onCreateVersion(meta)}
        sourceLabel={viewedSet?.name}
      />

      {/* Bulk edit dialog (centered) */}
      <BulkEditDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        count={bulkSelected.size}
        readOnly={baseReadOnly}
        readOnlyReason={bulkReadOnlyReason}
        onApply={handleApplyBulkEdit}
      />
    </aside>
  );
}
