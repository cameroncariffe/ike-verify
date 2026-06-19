import { useState } from 'react';
import {
  Search, ArrowUpDown, SlidersHorizontal, ChevronDown, ChevronRight,
  LayoutGrid, Play, FileText, History, Plus, Copy, MoreHorizontal
} from 'lucide-react';
import type { Pole, DesignSet, RuleSet } from '../../types';
import { ValidationBadge } from '../ui/ValidationBadge';
import { cn } from '../../lib/utils';

interface LeftSidebarProps {
  poles: Pole[];
  selectedPoleId: string | null;
  onSelectPole: (poleId: string) => void;
  designSets: DesignSet[];
  activeDesignSetId: string;
  onSelectDesignSet: (id: string) => void;
  onDuplicateDesignSet: (id: string) => void;
  onRunValidation: (ruleSetId: string) => void;
  ruleSets: RuleSet[];
  lastRun?: DesignSet['runHistory'][0];
}

function PoleListItem({
  pole,
  selected,
  onClick,
}: {
  pole: Pole;
  selected: boolean;
  onClick: () => void;
}) {
  const results = pole.validationResults ?? [];
  const failCount = results.filter(r => r.status === 'fail').length;
  const warnCount = results.filter(r => r.status === 'warning').length;
  const hasFail = failCount > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors group relative',
        selected
          ? 'bg-amber-50 border-r-2 border-[#363687]'
          : 'hover:bg-neutral-50'
      )}
    >
      <div className={cn(
        'w-4 h-4 rounded-full border flex items-center justify-center shrink-0',
        selected ? 'border-[#363687] bg-[#363687]' : 'border-neutral-300'
      )}>
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>

      <span className={cn(
        'text-sm flex-1 font-medium',
        selected ? 'text-[#2a2f3c]' : 'text-neutral-600'
      )}>
        {pole.poleNumber}
      </span>

      <div className="flex items-center gap-1">
        {hasFail && (
          <ValidationBadge status="fail" count={failCount} size="sm" />
        )}
        {warnCount > 0 && !hasFail && (
          <ValidationBadge status="warning" count={warnCount} size="sm" />
        )}
        {!hasFail && warnCount === 0 && results.length > 0 && (
          <ValidationBadge status="pass" size="sm" />
        )}
      </div>

      <span className="text-[10px] text-neutral-400 shrink-0 min-w-[80px] text-right">
        {pole.taggedDate}
      </span>

      <span
        role="button"
        tabIndex={0}
        onClick={e => { e.stopPropagation(); }}
        onKeyDown={e => { if (e.key === 'Enter') e.stopPropagation(); }}
        className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 rounded hover:bg-neutral-200 transition-all cursor-pointer"
      >
        <MoreHorizontal size={14} className="text-neutral-400" />
      </span>
    </button>
  );
}

export function LeftSidebar({
  poles,
  selectedPoleId,
  onSelectPole,
  designSets,
  activeDesignSetId,
  onSelectDesignSet,
  onDuplicateDesignSet,
  onRunValidation,
  ruleSets,
  lastRun,
}: LeftSidebarProps) {
  const [search, setSearch] = useState('');
  const [createDesignOpen, setCreateDesignOpen] = useState(true);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [resultsOpen, setResultsOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRuleSetId, setSelectedRuleSetId] = useState(ruleSets[0]?.id ?? '');

  const filteredPoles = poles.filter(p =>
    p.poleNumber.toLowerCase().includes(search.toLowerCase())
  );

  const activeSet = designSets.find(d => d.id === activeDesignSetId);

  return (
    <aside className="flex flex-col w-[260px] shrink-0 border-r border-neutral-200 bg-white overflow-hidden">
      {/* Job name header */}
      <div
        className="flex items-center justify-between px-3 h-12 border-b border-white/20 shrink-0"
        style={{ background: '#363687' }}
      >
        <span className="font-barlow font-semibold text-white text-sm">
          {activeSet?.name ?? 'Louisville43592'}
        </span>
        <button className="text-white/70 hover:text-white transition-colors p-1">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-neutral-100 shrink-0">
        <LayoutGrid size={15} className="text-neutral-400 shrink-0" />
        <div className="flex-1 flex items-center gap-1 bg-neutral-50 rounded border border-neutral-200 px-2 h-7">
          <Search size={12} className="text-neutral-400 shrink-0" />
          <input
            type="text"
            placeholder="Search poles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-xs flex-1 bg-transparent outline-none text-neutral-700 placeholder:text-neutral-400"
          />
        </div>
        <button className="p-1 rounded hover:bg-neutral-100 text-neutral-500">
          <ArrowUpDown size={14} />
        </button>
        <button className="p-1 rounded hover:bg-neutral-100 text-neutral-500">
          <SlidersHorizontal size={14} />
        </button>
      </div>

      {/* Poles list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredPoles.map(pole => (
          <PoleListItem
            key={pole.id}
            pole={pole}
            selected={pole.id === selectedPoleId}
            onClick={() => onSelectPole(pole.id)}
          />
        ))}
      </div>

      {/* Bottom sections */}
      <div className="border-t border-neutral-200 shrink-0">

        {/* Create Design */}
        <div className="border-b border-neutral-100">
          <button
            onClick={() => setCreateDesignOpen(o => !o)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors"
          >
            <Plus size={14} className="text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-700 flex-1">Create Design</span>
            {createDesignOpen ? <ChevronDown size={13} className="text-neutral-400" /> : <ChevronRight size={13} className="text-neutral-400" />}
          </button>
          {createDesignOpen && (
            <div className="px-3 pb-2.5 space-y-1.5">
              {designSets.map(ds => (
                <div
                  key={ds.id}
                  onClick={() => onSelectDesignSet(ds.id)}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors',
                    ds.id === activeDesignSetId
                      ? 'bg-indigo-50 text-[#363687] border border-indigo-200'
                      : 'text-neutral-600 hover:bg-neutral-50'
                  )}
                >
                  <FileText size={12} className="shrink-0" />
                  <span className="flex-1 truncate">{ds.name}</span>
                  {ds.isDuplicate && (
                    <span className="text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                      Copy
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); onDuplicateDesignSet(ds.id); }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-neutral-200 ml-auto"
                    title="Duplicate"
                  >
                    <Copy size={11} className="text-neutral-400" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => onDuplicateDesignSet(activeDesignSetId)}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-neutral-500 hover:bg-neutral-50 border border-dashed border-neutral-200 transition-colors"
              >
                <Copy size={11} />
                Duplicate active design
              </button>
            </div>
          )}
        </div>

        {/* Rules & Templates */}
        <div className="border-b border-neutral-100">
          <button
            onClick={() => setRulesOpen(o => !o)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors"
          >
            <FileText size={14} className="text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-700 flex-1">Rules & Templates</span>
            <span className="text-[10px] text-white bg-neutral-500 rounded px-1 py-0.5">
              ↗
            </span>
            {rulesOpen ? <ChevronDown size={13} className="text-neutral-400" /> : <ChevronRight size={13} className="text-neutral-400" />}
          </button>
          {rulesOpen && (
            <div className="px-3 pb-2.5 space-y-1.5">
              {ruleSets.map(rs => (
                <label
                  key={rs.id}
                  className={cn(
                    'flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
                    rs.id === selectedRuleSetId ? 'bg-indigo-50' : 'hover:bg-neutral-50'
                  )}
                >
                  <input
                    type="radio"
                    name="ruleSet"
                    value={rs.id}
                    checked={rs.id === selectedRuleSetId}
                    onChange={() => setSelectedRuleSetId(rs.id)}
                    className="mt-0.5 accent-[#363687]"
                  />
                  <div>
                    <div className="text-xs font-medium text-neutral-700 leading-tight">{rs.name}</div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">{rs.rules.length} rules</div>
                  </div>
                </label>
              ))}
              <button
                onClick={() => onRunValidation(selectedRuleSetId)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold text-white transition-colors"
                style={{ background: '#363687' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#2d2d72')}
                onMouseLeave={e => (e.currentTarget.style.background = '#363687')}
              >
                <Play size={11} />
                Run Validation
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="border-b border-neutral-100">
          <button
            onClick={() => setResultsOpen(o => !o)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors"
          >
            <FileText size={14} className="text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-700 flex-1">Results</span>
            {lastRun && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#b91c1c] font-semibold">{lastRun.summary.fail}F</span>
                <span className="text-[10px] text-neutral-400">/</span>
                <span className="text-[10px] text-[#1fa163] font-semibold">{lastRun.summary.pass}P</span>
              </div>
            )}
            {resultsOpen ? <ChevronDown size={13} className="text-neutral-400" /> : <ChevronRight size={13} className="text-neutral-400" />}
          </button>
          {resultsOpen && lastRun && (
            <div className="px-3 pb-2.5">
              <div className="text-[10px] text-neutral-400 mb-1.5">Last run: {lastRun.ruleSetName}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Pass', count: lastRun.summary.pass, color: 'text-[#1fa163]' },
                  { label: 'Fail', count: lastRun.summary.fail, color: 'text-[#b91c1c]' },
                  { label: 'Warning', count: lastRun.summary.warning, color: 'text-[#a16207]' },
                  { label: 'Review', count: lastRun.summary.review, color: 'text-[#1d4ed8]' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between bg-neutral-50 rounded px-2 py-1">
                    <span className="text-[10px] text-neutral-500">{item.label}</span>
                    <span className={`text-xs font-bold ${item.color}`}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* History */}
        <div>
          <button
            onClick={() => setHistoryOpen(o => !o)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors"
          >
            <History size={14} className="text-neutral-500" />
            <span className="text-xs font-semibold text-neutral-700 flex-1">History</span>
            {historyOpen ? <ChevronDown size={13} className="text-neutral-400" /> : <ChevronRight size={13} className="text-neutral-400" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
