import { useState } from 'react';
import {
  Search, ArrowUpDown, ListFilter, LayoutList,
  ChevronDown, ChevronUp, ArrowLeftFromLine,
  Wand2, BookMarked, CheckCircle, History, ExternalLink,
  MoreHorizontal,
} from 'lucide-react';
import type { Pole, DesignSet, RuleSet } from '../../types';
import { ValidationBadge } from '../ui/ValidationBadge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { cn } from '../../lib/utils';

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

// ─── Pole list row ────────────────────────────────────────────────────────────
function PoleListItem({
  pole, selected, onClick,
}: {
  pole: Pole; selected: boolean; onClick: () => void;
}) {
  const results = pole.validationResults ?? [];
  const failCount  = results.filter(r => r.status === 'fail').length;
  const warnCount  = results.filter(r => r.status === 'warning').length;
  const passAll    = results.length > 0 && failCount === 0 && warnCount === 0;
  const hasResults = results.length > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 h-10 text-left transition-colors group border-b border-[#f7f9fc] relative',
        selected ? 'bg-[#f0f0fa]' : 'bg-white hover:bg-neutral-50'
      )}
    >
      {/* Radio circle */}
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
        selected ? 'border-[#363687] bg-[#363687]' : 'border-neutral-300 bg-white'
      )}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>

      {/* Pole number */}
      <span className={cn(
        'text-sm flex-1 text-left',
        selected ? 'font-medium text-[#2a2f3c]' : 'font-normal text-[#2a2f3c]'
      )}>
        {pole.poleNumber}
      </span>

      {/* Validation badges (only when results exist) */}
      {hasResults && (
        <div className="flex items-center gap-1 shrink-0">
          {failCount > 0  && <ValidationBadge status="fail"    count={failCount} />}
          {warnCount > 0 && failCount === 0 && <ValidationBadge status="warning" count={warnCount} />}
          {passAll        && <ValidationBadge status="pass" />}
        </div>
      )}

      {/* Date */}
      <span className="text-[11px] text-[#a3a3a3] shrink-0 tabular-nums">
        {pole.taggedDate}
      </span>

      {/* Kebab hover */}
      <span
        role="button"
        tabIndex={0}
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Enter') e.stopPropagation(); }}
        className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-neutral-200 transition-all cursor-pointer"
      >
        <MoreHorizontal size={14} className="text-neutral-400" />
      </span>
    </button>
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

// ─── Main sidebar ─────────────────────────────────────────────────────────────
export function LeftSidebar({
  poles, selectedPoleId, onSelectPole,
  designSets: _designSets, activeDesignSetId: _activeDesignSetId,
  onSelectDesignSet: _onSelectDesignSet,
  onCreateDesignSet, onRunValidation,
  ruleSets, lastRun, jobName,
}: LeftSidebarProps) {
  const [search, setSearch]             = useState('');
  const [showSearch, setShowSearch]     = useState(false);
  const [createOpen, setCreateOpen]     = useState(false);
  const [rulesOpen, setRulesOpen]       = useState(false);
  const [resultsOpen, setResultsOpen]   = useState(false);
  const [historyOpen, setHistoryOpen]   = useState(false);

  const filteredPoles = poles.filter(p =>
    p.poleNumber.toLowerCase().includes(search.toLowerCase())
  );

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
        <button className="text-white hover:text-white/70 transition-colors shrink-0">
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
          <button className="text-white hover:text-white/70 transition-colors">
            <ArrowUpDown size={24} />
          </button>
          <button className="text-white hover:text-white/70 transition-colors">
            <ListFilter size={24} />
          </button>
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
