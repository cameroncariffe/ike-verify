import { useState, useEffect, createContext, useContext } from 'react';
import {
  Info, ChevronDown, Pencil, Ruler, Copy, X, CircleX, CircleAlert, Lock, GitBranchPlus,
} from 'lucide-react';
import type { Pole, DetailColor, FieldIssue } from '../../types';
import { ValidationBadge } from '../ui/ValidationBadge';
import { getPoleResultStatus } from '../../data/mockData';
import { cn } from '../../lib/utils';

interface PoleDetailsPanelProps {
  pole: Pole | null;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
  /** Read-only when viewing a non-active version or the imported Original. */
  readOnly?: boolean;
  /** Why the panel is read-only, to tailor the guidance shown. */
  readOnlyReason?: 'original' | 'inactive' | null;
  /** Bumped externally (e.g. "Edit properties") to drop the panel into edit mode. */
  editSignal?: number;
  /** Persist an edit to the viewed version's pole. */
  onUpdatePole?: (poleId: string, patch: Partial<Pole>) => void;
  /** Make the viewed version the active (editable) one. */
  onSetActive?: () => void;
}

const NARROW_PANEL_WIDTH = 420;

const NarrowPanelContext = createContext(false);

function useNarrowPanel() {
  return useContext(NarrowPanelContext);
}

/** Clamp text to three lines without collapsing row height. */
const clampLines = 'line-clamp-3 break-words leading-tight';

const leftBorder: Record<DetailColor, string> = {
  neutral: 'border-[#d4d4d4]',
  red: 'border-[#ef4444]',
  orange: 'border-[#f97316]',
  amber: 'border-[#f59e0b]',
  lime: 'border-[#84cc16]',
  emerald: 'border-[#10b981]',
  blue: 'border-[#3b82f6]',
};

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      className="absolute left-0 top-0 h-full w-1.5 -ml-0.5 cursor-ew-resize z-10 group"
    >
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-transparent group-hover:bg-[#363687] transition-colors" />
    </div>
  );
}

// ─── Section title row (e.g. "Make Ready 1", "Span 6") ──────────────────────────
function SectionTitle({
  title, count, active = false,
}: {
  title: string; count?: number; active?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 min-h-8 pt-2 pb-1 border-b border-[#d4d4d4] w-full">
      <span className={cn(
        'text-base leading-6 font-semibold min-w-0',
        active ? 'text-neutral-700' : 'text-neutral-400',
      )}>
        {title}
      </span>
      {count !== undefined && (
        <span className="text-base leading-6 text-neutral-700 shrink-0">({count})</span>
      )}
    </div>
  );
}

// ─── Colored subtitle bar (spans / wires) ───────────────────────────────────────
function SubtitleBox({ color, children }: { color: DetailColor; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-start p-2 bg-[#f5f5f5] border-l-4 w-full', leftBorder[color])}>
      <span className={cn('flex-1 min-w-0 text-sm text-neutral-700', clampLines)}>{children}</span>
    </div>
  );
}

const issueText: Record<FieldIssue, string> = {
  fail: 'text-[#b91c1c]',
  warning: 'text-[#a16207]',
};
const issueBorder: Record<FieldIssue, string> = {
  fail: 'border-[#b91c1c]',
  warning: 'border-[#a16207]',
};

// ─── Detail row (label + value, supports dimmed / issue / edit) ─────────────────
function DetailRow({
  label, value, dimmed = false, hasInfo = false, edit = false, options,
  issue, field, onCommit,
}: {
  label: string;
  value?: string | number;
  dimmed?: boolean;
  hasInfo?: boolean;
  edit?: boolean;
  options?: string[];
  issue?: FieldIssue;
  field?: keyof Pole;
  onCommit?: (field: keyof Pole, value: string) => void;
}) {
  const narrow = useNarrowPanel();
  const display = value ?? '–';
  const activeIssue = issue;

  const labelTone = activeIssue ? issueText[activeIssue] : dimmed ? 'text-neutral-400' : 'text-neutral-700';
  const valueTone = labelTone;

  const commit = (v: string) => { if (field && onCommit) onCommit(field, v); };

  const labelEl = (
    <div className="flex items-start gap-1 min-w-0">
      {activeIssue === 'fail' && <CircleX size={14} className="text-[#b91c1c] shrink-0 mt-0.5" />}
      {activeIssue === 'warning' && <CircleAlert size={14} className="text-[#a16207] shrink-0 mt-0.5" />}
      <span className={cn('text-sm font-semibold min-w-0', clampLines, labelTone)}>{label}</span>
      {hasInfo && <Info size={14} className="text-neutral-400 shrink-0 mt-0.5" />}
    </div>
  );

  const valueEl = edit ? (
    <div className="flex items-center gap-1 min-w-0 w-full">
      {options ? (
        <select
          defaultValue={typeof value === 'string' ? value : undefined}
          onChange={e => commit(e.target.value)}
          className={cn(
            'flex-1 min-w-0 h-7 px-2 text-sm rounded border bg-white text-neutral-700 outline-none focus:border-[#363687]',
            activeIssue ? issueBorder[activeIssue] : 'border-neutral-300'
          )}
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          defaultValue={value === undefined ? '' : String(value)}
          placeholder="Description"
          onBlur={e => commit(e.target.value)}
          className={cn(
            'flex-1 min-w-0 h-7 px-2 text-sm rounded border bg-white text-neutral-700 outline-none focus:border-[#363687] placeholder:text-neutral-400',
            activeIssue ? issueBorder[activeIssue] : 'border-neutral-300'
          )}
        />
      )}
      <button className="shrink-0 p-1 text-neutral-400 hover:text-neutral-600" title="Copy">
        <Copy size={15} />
      </button>
      <button className="shrink-0 p-1 text-neutral-400 hover:text-neutral-600" title="Clear">
        <X size={15} />
      </button>
    </div>
  ) : (
    <span className={cn('text-sm min-w-0 block whitespace-pre-line', clampLines, valueTone)}>{display}</span>
  );

  if (narrow) {
    return (
      <div className="py-0.5 w-full">
        {labelEl}
        <div className="min-w-0">{valueEl}</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[minmax(0,38%)_minmax(0,1fr)] gap-x-3 items-start py-0.5 w-full">
      {labelEl}
      <div className="min-w-0">{valueEl}</div>
    </div>
  );
}

export function PoleDetailsPanel({
  pole,
  width,
  onResizeStart,
  readOnly = false,
  readOnlyReason = null,
  editSignal = 0,
  onUpdatePole,
  onSetActive,
}: PoleDetailsPanelProps) {
  const [editMode, setEditMode] = useState(false);
  const [spansExpanded, setSpansExpanded] = useState(true);

  // External request to edit (from the pole list "Edit properties" action).
  useEffect(() => {
    if (editSignal > 0 && !readOnly) setEditMode(true);
  }, [editSignal, readOnly]);
  const narrow = width < NARROW_PANEL_WIDTH;
  // Read-only versions can never enter edit mode.
  const isEditing = editMode && !readOnly;
  const commit = (field: keyof Pole, value: string) => {
    if (pole) onUpdatePole?.(pole.id, { [field]: value } as Partial<Pole>);
  };

  if (!pole) {
    return (
      <NarrowPanelContext.Provider value={narrow}>
      <aside
        style={{ width }}
        className="relative shrink-0 flex flex-col border-l border-neutral-200 bg-white"
      >
        <ResizeHandle onMouseDown={onResizeStart} />
        <div className="flex items-center px-3 h-12 shrink-0" style={{ background: '#363687' }}>
          <span className="font-barlow font-semibold text-white text-base flex-1">Pole details</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
          Select a pole to view details
        </div>
      </aside>
      </NarrowPanelContext.Provider>
    );
  }

  // Errors are only surfaced for poles that actually have an error icon
  // (a failing rule result). Passing/unverified poles show no flags.
  const poleHasError = getPoleResultStatus(pole) === 'fail';
  const poleIssues = poleHasError ? (pole.fieldIssues ?? {}) : {};

  // Tally fail/warning flags across the pole and all its spans for the pills.
  const allIssues: FieldIssue[] = poleHasError ? [
    ...Object.values(poleIssues),
    ...(pole.spans ?? []).flatMap(s => Object.values(s.issues ?? {})),
  ] : [];
  const totalFail = allIssues.filter(v => v === 'fail').length;
  const totalWarn = allIssues.filter(v => v === 'warning').length;

  return (
    <NarrowPanelContext.Provider value={narrow}>
    <aside
      style={{ width }}
      className="relative shrink-0 flex flex-col border-l border-neutral-200 bg-white overflow-hidden"
    >
      <ResizeHandle onMouseDown={onResizeStart} />

      {/* Header row 1: Title */}
      <div className="flex items-center px-3 h-12 shrink-0" style={{ background: '#363687' }}>
        <span className="font-barlow font-semibold text-white text-base flex-1">Pole details</span>
      </div>

      {/* Header row 2: edit + pole number + show results + info + expand */}
      <div className={cn(
        'flex items-center gap-2 px-3 border-b border-[#f7f9fc] shrink-0',
        narrow ? 'flex-wrap min-h-12 py-2' : 'h-12 gap-4',
      )} style={{ background: '#363687' }}>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center justify-center w-7 h-7 rounded-lg border border-[#e5e5e5] bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Measure"
          >
            <Ruler size={16} />
          </button>
          <button
            onClick={() => { if (!readOnly) setEditMode(o => !o); }}
            disabled={readOnly}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-lg border transition-colors',
              readOnly
                ? 'border-[#e5e5e5] bg-white/5 text-white/40 cursor-not-allowed'
                : isEditing
                  ? 'border-white bg-white text-[#363687]'
                  : 'border-[#e5e5e5] bg-white/10 text-white hover:bg-white/20'
            )}
            title={readOnly ? 'Imported design is read-only' : 'Edit attributes'}
          >
            {readOnly ? <Lock size={16} /> : <Pencil size={16} />}
          </button>
        </div>

        <span className="font-barlow font-semibold text-white text-base flex-1 truncate">
          {pole.poleNumber}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          <button className="text-white/80 hover:text-white transition-colors" title="Info">
            <Info size={20} />
          </button>
          <button
            onClick={() => setSpansExpanded(o => !o)}
            className="text-white/80 hover:text-white transition-colors"
            title={spansExpanded ? 'Collapse spans' : 'Expand spans'}
          >
            <ChevronDown size={20} className={cn('transition-transform', spansExpanded ? '' : '-rotate-90')} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-2 flex flex-col gap-2">

        {/* Read-only notice — tailored to why the version can't be edited */}
        {readOnly && (
          <div className="flex items-start gap-2 rounded-lg border border-[#e3e1f3] bg-[#f4f3fb] px-3 py-2">
            <Lock size={15} className="text-[#363687] shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              {readOnlyReason === 'inactive' ? (
                <>
                  <p className="text-[13px] font-medium text-[#2a2f3c] leading-snug">Viewing a non-active version</p>
                  <p className="text-[11px] text-neutral-500 leading-snug mt-0.5">
                    This version is read-only. Set it as active to make changes.
                  </p>
                  {onSetActive && (
                    <button
                      onClick={onSetActive}
                      className="mt-1.5 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-[#363687] text-white text-xs font-medium hover:bg-[#2f2f78] transition-colors"
                    >
                      <GitBranchPlus size={13} />
                      Set as active
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[13px] font-medium text-[#2a2f3c] leading-snug">Imported design (read-only)</p>
                  <p className="text-[11px] text-neutral-500 leading-snug mt-0.5">
                    Run rules to check it, then create a version to make changes.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Result summary pills */}
        {(totalFail > 0 || totalWarn > 0) && (
          <div className="flex items-center gap-2 pb-1">
            {totalFail > 0 && <ValidationBadge status="fail" count={totalFail} />}
            {totalWarn > 0 && <ValidationBadge status="warning" count={totalWarn} />}
          </div>
        )}

        {/* Pole attributes */}
        <DetailRow label="Status" value={pole.status} edit={isEditing} options={['HOA Complete', 'In Progress', 'Pending Review']} field="status" onCommit={commit} />
        <DetailRow label="OP#" value={pole.opNumber} edit={isEditing} field="opNumber" onCommit={commit} />
        <DetailRow label="Id" value={pole.externalId} edit={isEditing} field="externalId" onCommit={commit} />
        <DetailRow label="Tag Photos" value={pole.tagPhotos} dimmed={!pole.tagPhotos} edit={isEditing} />
        <DetailRow label="Type" value={pole.type} edit={isEditing} options={[pole.type, 'Douglas Fir > 3 > 45']} field="type" onCommit={commit} />
        <DetailRow label="Owner" value={pole.owner} edit={isEditing} options={[pole.owner, 'ELECTRIC > 002-Evergy']} field="owner" onCommit={commit} />
        <DetailRow label={'Circumference (")'} value={pole.circumference} dimmed={!pole.circumference} edit={isEditing} field="circumference" onCommit={commit} />
        <DetailRow label="Tip" value={pole.tip} edit={isEditing} field="tip" onCommit={commit} />
        <DetailRow
          label="Location"
          value={`Latitude: ${pole.location.lat}\nLongitude: ${pole.location.lng}\nAltitude: ${pole.location.altitude}`}
          hasInfo
          edit={isEditing}
        />
        <DetailRow label="Note" value={pole.note} dimmed={!pole.note} edit={isEditing} field="note" onCommit={commit} />
        <DetailRow label="PLA Result" value={pole.plaResult} dimmed={!pole.plaResult} edit={isEditing} field="plaResult" onCommit={commit} />
        <DetailRow label="IKEphoto" value={pole.ikePhoto} hasInfo edit={isEditing} />
        <DetailRow label="Mid Span IKEphoto" value={pole.midSpanIkePhoto} dimmed={!pole.midSpanIkePhoto} edit={isEditing} />
        <DetailRow label="Comm to LCE (Evergy)" value={pole.commToLce} issue={poleIssues.commToLce} edit={isEditing} field="commToLce" onCommit={commit} />
        <DetailRow label="Comm to Comm (Evergy)" value={pole.commToComm} issue={poleIssues.commToComm} edit={isEditing} field="commToComm" onCommit={commit} />
        <DetailRow label="Comm to STLT (NESC)" value={pole.commToStlt} issue={poleIssues.commToStlt} dimmed={!pole.commToStlt && !poleIssues.commToStlt} edit={isEditing} field="commToStlt" onCommit={commit} />

        {/* Lowest Controlling Electrical */}
        <SectionTitle title="Lowest Controlling Electrical" />

        {/* Make Ready */}
        {pole.makeReady && pole.makeReady.length > 0 && (
          <>
            <SectionTitle title="Make Ready" count={pole.makeReady.length} active />
            {pole.makeReady.map(mr => (
              <SubtitleBox key={mr.id} color="neutral">{mr.description}</SubtitleBox>
            ))}
          </>
        )}

        {/* Equipment */}
        <SectionTitle title="Equipment" />

        {/* Anchor */}
        <SectionTitle title="Anchor" />

        {/* Span (children of Make Ready) — each span owns its wires */}
        {pole.spans && pole.spans.length > 0 && (
          <>
            <SectionTitle title="Span" count={pole.spanCount ?? pole.spans.length} active />
            {pole.spans.map(span => {
              const sIssues = poleHasError ? (span.issues ?? {}) : {};
              return (
              <div key={span.id} className="flex flex-col gap-2 w-full">
                <SubtitleBox color={span.color}>{span.label}</SubtitleBox>
                {spansExpanded && (
                  <div className="flex flex-col gap-2 px-2 pb-1">
                    <DetailRow label="Span Length" value={span.length} issue={sIssues.length} edit={isEditing} />
                    <DetailRow label="Type" value={span.type} edit={isEditing} />
                    <DetailRow label="Environment" value={span.environment} dimmed={!span.environment} edit={isEditing} />
                    <DetailRow label="Mid Span IKEphoto" value={span.midSpanIkePhoto} hasInfo edit={isEditing} />
                    <DetailRow label="Note" value={span.note} dimmed={!span.note} edit={isEditing} />
                    <DetailRow label="Comm to Sec (Evergy)" value={span.commToSecEvergy} dimmed={!span.commToSecEvergy} issue={sIssues.commToSecEvergy} edit={isEditing} />
                    <DetailRow label="Comm to Neut (Evergy)" value={span.commToNeutEvergy} dimmed={!span.commToNeutEvergy} issue={sIssues.commToNeutEvergy} edit={isEditing} />
                    <DetailRow label="Comm to Comm (Evergy)" value={span.commToCommEvergy} dimmed={!span.commToCommEvergy} issue={sIssues.commToCommEvergy} edit={isEditing} />
                    <DetailRow label="Comm to Sec (NESC)" value={span.commToSecNesc} dimmed={!span.commToSecNesc} issue={sIssues.commToSecNesc} edit={isEditing} />
                    <DetailRow label="Comm to Neut (NESC)" value={span.commToNeutNesc} dimmed={!span.commToNeutNesc} issue={sIssues.commToNeutNesc} edit={isEditing} />
                    <DetailRow label="Comm to Comm (NESC)" value={span.commToCommNesc} dimmed={!span.commToCommNesc} issue={sIssues.commToCommNesc} edit={isEditing} />

                    {/* Wire (children of this span) */}
                    {span.wires && span.wires.length > 0 && (
                      <>
                        <SectionTitle title="Wire" count={span.wires.length} active />
                        {span.wires.map(wire => (
                          <SubtitleBox key={wire.id} color={wire.color}>{wire.label}</SubtitleBox>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </>
        )}
      </div>
    </aside>
    </NarrowPanelContext.Provider>
  );
}
