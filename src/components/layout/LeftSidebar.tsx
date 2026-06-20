import { useState } from 'react';
import {
  Search, ArrowUpDown, ListFilter, LayoutList,
  ChevronDown, ChevronUp, ArrowLeftFromLine, ArrowRightFromLine,
  Wand2, BookMarked, CheckCircle, History, ExternalLink,
  MoreVertical, UtilityPole,
  Circle, CircleCheck, CircleX, CircleAlert,
} from 'lucide-react';
import type { Pole, DesignSet, RuleSet, ValidationStatus } from '../../types';
import { ValidationBadge } from '../ui/ValidationBadge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
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
  onSelectDesignSet: (id: string) => void;
  onCreateDesignSet: (name: string) => void;
  onRunValidation: (ruleSetId: string) => void;
  ruleSets: RuleSet[];
  lastRun?: DesignSet['runHistory'][0];
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

// ─── Pole list row ────────────────────────────────────────────────────────────
function PoleListItem({
  pole, selected, onClick, onKebab,
}: {
  pole: Pole; selected: boolean; onClick: () => void; onKebab?: () => void;
}) {
  const status = getPoleStatus(pole);

  return (
    <div className="px-2 py-0.5 bg-white">
      <button
        onClick={onClick}
        className={cn(
          'w-full flex items-center gap-1 h-8 pl-2 pr-1 py-1 rounded-[4px] text-left transition-colors group relative',
          selected
            ? 'bg-[rgba(255,167,14,0.1)] border border-[rgba(255,167,14,0.5)]'
            : 'border border-transparent hover:bg-[rgba(255,167,14,0.1)]'
        )}
      >
        {/* Status indicator */}
        <PoleStatusIndicator status={status} />

        {/* Pole number */}
        <span className="font-barlow text-sm flex-1 text-left text-[#3c404d] truncate">
          {pole.poleNumber}
        </span>

        {/* Date */}
        <span className="font-barlow text-xs text-[#9ea2aa] shrink-0 text-right whitespace-nowrap">
          {pole.taggedDate}
        </span>

        {/* Kebab — visible on hover or when active */}
        <span
          role="button"
          tabIndex={0}
          onClick={e => { e.stopPropagation(); onKebab?.(); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onKebab?.(); } }}
          className={cn(
            'shrink-0 flex items-center justify-center w-5 h-5 rounded transition-opacity cursor-pointer hover:bg-black/5',
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        >
          <MoreVertical size={18} className="text-[#3c404d]" />
        </span>
      </button>
    </div>
  );
}

// ─── Section accordion header ─────────────────────────────────────────────────
function SectionHeader({
  icon, label, isOpen, onToggle, badge,
}: {
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-2 h-10 text-left border-b border-[#f7f9fc] shrink-0"
      style={{ background: '#363687' }}
    >
      <div className="shrink-0 text-white">{icon}</div>
      <span className="flex-1 text-sm font-medium text-white leading-none">{label}</span>
      {badge}
      {isOpen
        ? <ChevronUp size={20} className="text-white shrink-0" />
        : <ChevronDown size={20} className="text-white shrink-0" />}
    </button>
  );
}

// ─── Create Design section body ───────────────────────────────────────────────
function CreateDesignBody({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <div className="px-3 py-3 bg-white border-b border-neutral-100 space-y-3">
      <p className="text-sm font-semibold text-[#2a2f3c]">Create Design Set</p>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-700">Design set name</label>
        <Input
          placeholder="Value"
          value={name}
          onChange={e => setName(e.target.value)}
          className="h-8 text-sm"
        />
        <p className="text-[11px] text-neutral-400">Name will apply to every pole in this source.</p>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setName('')}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs bg-[#2a2f3c] hover:bg-[#1a1f2c] text-white"
          onClick={() => { if (name.trim()) { onSubmit(name.trim()); setName(''); } }}
        >
          Create
        </Button>
      </div>
    </div>
  );
}

// ─── Rules & Templates section body ──────────────────────────────────────────
function RulesBody({
  ruleSets, onRun,
}: {
  ruleSets: RuleSet[];
  onRun: (id: string) => void;
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
      <div className="h-1" />
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
      <button className={railBtn} onClick={() => onExpandToSection('create')} title="Create Design">
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

// ─── Main sidebar ─────────────────────────────────────────────────────────────
export function LeftSidebar({
  poles, selectedPoleId, onSelectPole,
  designSets: _designSets, activeDesignSetId: _activeDesignSetId,
  onSelectDesignSet: _onSelectDesignSet,
  onCreateDesignSet, onRunValidation,
  ruleSets, lastRun, jobName,
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

      {/* ── Nav / Toolbar ── */}
      <div
        className="flex items-center gap-2 px-3 h-12 shrink-0 border-b border-[#f7f9fc]"
        style={{ background: '#363687' }}
      >
        <button className="text-white hover:text-white/70 transition-colors shrink-0">
          <LayoutList size={24} />
        </button>

        {/* Inline search (shown when search icon is clicked) */}
        {showSearch && (
          <Input
            autoFocus
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onBlur={() => { if (!search) setShowSearch(false); }}
            className="flex-1 h-7 text-xs bg-white/10 border-white/30 text-white placeholder:text-white/50 focus-visible:ring-0"
          />
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <button
            onClick={() => setShowSearch(s => !s)}
            className="text-white hover:text-white/70 transition-colors"
          >
            <Search size={24} />
          </button>

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
            onClick={() => onSelectPole(pole.id)}
          />
        ))}
      </div>

      {/* ── Bottom accordion sections ── */}
      <div className="shrink-0 border-t border-neutral-200">

        {/* Create Design */}
        <SectionHeader
          icon={<Wand2 size={20} />}
          label="Create Design"
          isOpen={createOpen}
          onToggle={() => setCreateOpen(o => !o)}
        />
        {createOpen && (
          <CreateDesignBody onSubmit={name => { onCreateDesignSet(name); setCreateOpen(false); }} />
        )}

        {/* Rules & Templates */}
        <SectionHeader
          icon={<BookMarked size={20} />}
          label="Rules & Templates"
          isOpen={rulesOpen}
          onToggle={() => setRulesOpen(o => !o)}
          badge={
            <button className="text-white hover:text-white/70 transition-colors shrink-0 p-0.5">
              <ExternalLink size={14} />
            </button>
          }
        />
        {rulesOpen && <RulesBody ruleSets={ruleSets} onRun={id => { onRunValidation(id); }} />}

        {/* Results */}
        <SectionHeader
          icon={<CheckCircle size={20} />}
          label="Results"
          isOpen={resultsOpen}
          onToggle={() => setResultsOpen(o => !o)}
        />
        {resultsOpen && lastRun && <ResultsBody lastRun={lastRun} />}

        {/* History */}
        <SectionHeader
          icon={<History size={20} />}
          label="History"
          isOpen={historyOpen}
          onToggle={() => setHistoryOpen(o => !o)}
        />
      </div>
    </aside>
  );
}
