import { useState } from 'react';
import {
  Info, ChevronDown, Pencil, Copy, X, CircleX,
} from 'lucide-react';
import type { Pole, DetailColor } from '../../types';
import { ValidationBadge } from '../ui/ValidationBadge';
import { cn } from '../../lib/utils';

interface PoleDetailsPanelProps {
  pole: Pole | null;
  showResults: boolean;
  onToggleResults: () => void;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
}

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
    <div className="flex items-center gap-2 h-8 pt-2 pb-1 border-b border-[#d4d4d4] w-full">
      <span className={cn('text-base leading-6 font-semibold', active ? 'text-neutral-700' : 'text-neutral-400')}>
        {title}
      </span>
      {count !== undefined && (
        <span className="text-base leading-6 text-neutral-700">{count}</span>
      )}
    </div>
  );
}

// ─── Colored subtitle bar (spans / wires) ───────────────────────────────────────
function SubtitleBox({ color, children }: { color: DetailColor; children: React.ReactNode }) {
  return (
    <div className={cn('flex items-center min-h-9 p-2 bg-[#f5f5f5] border-l-4 w-full', leftBorder[color])}>
      <span className="flex-1 text-sm leading-5 text-neutral-700">{children}</span>
    </div>
  );
}

// ─── Detail row (label + value, supports dimmed / failing / edit) ───────────────
function DetailRow({
  label, value, dimmed = false, hasInfo = false, failing = false, edit = false,
  options,
}: {
  label: string;
  value?: string | number;
  dimmed?: boolean;
  hasInfo?: boolean;
  failing?: boolean;
  edit?: boolean;
  options?: string[];
}) {
  const display = value ?? '–';

  return (
    <div className="flex items-start gap-2 min-h-6 pt-0.5 w-full">
      <div className="flex items-center gap-1 w-[200px] shrink-0">
        {failing && <CircleX size={14} className="text-[#ef4444] shrink-0" />}
        <span className={cn(
          'text-sm leading-5 font-semibold whitespace-nowrap',
          failing ? 'text-[#ef4444]' : dimmed ? 'text-neutral-400' : 'text-neutral-700'
        )}>
          {label}
        </span>
        {hasInfo && <Info size={14} className="text-neutral-400 shrink-0" />}
      </div>

      {edit ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {options ? (
            <select
              defaultValue={typeof value === 'string' ? value : undefined}
              className={cn(
                'flex-1 min-w-0 h-7 px-2 text-sm rounded border bg-white text-neutral-700 outline-none focus:border-[#363687]',
                failing ? 'border-[#ef4444]' : 'border-neutral-300'
              )}
            >
              {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              defaultValue={value === undefined ? '' : String(value)}
              placeholder="Description"
              className={cn(
                'flex-1 min-w-0 h-7 px-2 text-sm rounded border bg-white text-neutral-700 outline-none focus:border-[#363687] placeholder:text-neutral-400',
                failing ? 'border-[#ef4444]' : 'border-neutral-300'
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
        <div className="flex-1 min-w-0">
          <span className={cn(
            'text-sm leading-5 whitespace-pre-line',
            failing ? 'text-[#ef4444]' : dimmed ? 'text-neutral-400' : 'text-neutral-700'
          )}>
            {display}
          </span>
        </div>
      )}
    </div>
  );
}

export function PoleDetailsPanel({
  pole,
  showResults,
  onToggleResults,
  width,
  onResizeStart,
}: PoleDetailsPanelProps) {
  const [editMode, setEditMode] = useState(false);
  const [spansExpanded, setSpansExpanded] = useState(true);

  if (!pole) {
    return (
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
    );
  }

  const results = pole.validationResults ?? [];
  const failResults = results.filter(r => r.status === 'fail');
  const warnResults = results.filter(r => r.status === 'warning');
  const totalFail = failResults.length;
  const totalWarn = warnResults.length;

  // Map specific failing rules to the pole-attribute rows they affect.
  const lceFails = showResults && failResults.some(r => r.ruleId === 'r-001');
  const commFails = showResults && failResults.some(r => r.ruleId === 'r-002');

  return (
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
      <div className="flex items-center gap-4 px-3 h-12 border-b border-[#f7f9fc] shrink-0" style={{ background: '#363687' }}>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center justify-center w-7 h-7 rounded-lg border border-[#e5e5e5] bg-white/10 text-white hover:bg-white/20 transition-colors"
            title="Edit geometry"
          >
            <Pencil size={16} className="-rotate-90" />
          </button>
          <button
            onClick={() => setEditMode(o => !o)}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-lg border transition-colors',
              editMode
                ? 'border-white bg-white text-[#363687]'
                : 'border-[#e5e5e5] bg-white/10 text-white hover:bg-white/20'
            )}
            title="Edit attributes"
          >
            <Pencil size={16} />
          </button>
        </div>

        <span className="font-barlow font-semibold text-white text-base flex-1 truncate">
          {pole.poleNumber}
        </span>

        {/* Show results toggle */}
        <button onClick={onToggleResults} className="flex items-center gap-2 text-white shrink-0">
          <div className={cn(
            'relative w-8 h-[18px] rounded-full transition-colors',
            showResults ? 'bg-[#4ade80]' : 'bg-white/30'
          )}>
            <div className={cn(
              'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all',
              showResults ? 'left-[18px]' : 'left-0.5'
            )} />
          </div>
          <span className="whitespace-nowrap text-sm">Show results</span>
        </button>

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

        {/* Result summary pills */}
        {showResults && (totalFail > 0 || totalWarn > 0) && (
          <div className="flex items-center gap-2 pb-1">
            {totalFail > 0 && <ValidationBadge status="fail" count={totalFail} />}
            {totalWarn > 0 && <ValidationBadge status="warning" count={totalWarn} />}
          </div>
        )}

        {/* Pole attributes */}
        <DetailRow label="Status" value={pole.status} edit={editMode} options={['HOA Complete', 'In Progress', 'Pending Review']} />
        <DetailRow label="OP#" value={pole.opNumber} edit={editMode} />
        <DetailRow label="Id" value={pole.externalId} edit={editMode} />
        <DetailRow label="Tag Photos" value={pole.tagPhotos} dimmed={!pole.tagPhotos} edit={editMode} />
        <DetailRow label="Type" value={pole.type} edit={editMode} options={[pole.type, 'Douglas Fir > 3 > 45']} />
        <DetailRow label="Owner" value={pole.owner} edit={editMode} options={[pole.owner, 'ELECTRIC > 002-Evergy']} />
        <DetailRow label={'Circumference (")'} value={pole.circumference} dimmed={!pole.circumference} edit={editMode} />
        <DetailRow label="Tip" value={pole.tip} edit={editMode} />
        <DetailRow
          label="Location"
          value={`Latitude: ${pole.location.lat}\nLongitude: ${pole.location.lng}\nAltitude: ${pole.location.altitude}`}
          hasInfo
          edit={editMode}
        />
        <DetailRow label="Note" value={pole.note} dimmed={!pole.note} edit={editMode} />
        <DetailRow label="PLA Result" value={pole.plaResult} dimmed={!pole.plaResult} edit={editMode} />
        <DetailRow label="IKEphoto" value={pole.ikePhoto} hasInfo edit={editMode} />
        <DetailRow label="Mid Span IKEphoto" value={pole.midSpanIkePhoto} dimmed={!pole.midSpanIkePhoto} edit={editMode} />
        <DetailRow label="Comm to LCE (Evergy)" value={pole.commToLce} failing={lceFails} edit={editMode} />
        <DetailRow label="Comm to Comm (Evergy)" value={pole.commToComm} failing={commFails} edit={editMode} />
        <DetailRow label="Comm to STLT (NESC)" value={pole.commToStlt} dimmed={!pole.commToStlt} edit={editMode} />

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

        {/* Span */}
        {pole.spans && pole.spans.length > 0 && (
          <>
            <SectionTitle title="Span" count={pole.spanCount ?? pole.spans.length} active />
            {pole.spans.map(span => (
              <div key={span.id} className="flex flex-col gap-2 w-full">
                <SubtitleBox color={span.color}>{span.label}</SubtitleBox>
                {spansExpanded && (
                  <div className="flex flex-col gap-2 px-2 pb-1">
                    <DetailRow label="Span Length" value={span.length} edit={editMode} />
                    <DetailRow label="Type" value={span.type} edit={editMode} />
                    <DetailRow label="Environment" value={span.environment} dimmed={!span.environment} edit={editMode} />
                    <DetailRow label="Mid Span IKEphoto" value={span.midSpanIkePhoto} hasInfo edit={editMode} />
                    <DetailRow label="Note" value={span.note} dimmed={!span.note} edit={editMode} />
                    <DetailRow label="Comm to Sec (Evergy)" value={span.commToSecEvergy} dimmed={!span.commToSecEvergy} edit={editMode} />
                    <DetailRow label="Comm to Neut (Evergy)" value={span.commToNeutEvergy} dimmed={!span.commToNeutEvergy} edit={editMode} />
                    <DetailRow label="Comm to Comm (Evergy)" value={span.commToCommEvergy} dimmed={!span.commToCommEvergy} edit={editMode} />
                    <DetailRow label="Comm to Sec (NESC)" value={span.commToSecNesc} dimmed={!span.commToSecNesc} edit={editMode} />
                    <DetailRow label="Comm to Neut (NESC)" value={span.commToNeutNesc} dimmed={!span.commToNeutNesc} edit={editMode} />
                    <DetailRow label="Comm to Comm (NESC)" value={span.commToCommNesc} dimmed={!span.commToCommNesc} edit={editMode} />
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Wire */}
        {pole.wires && pole.wires.length > 0 && (
          <>
            <SectionTitle title="Wire" count={pole.wires.length} active />
            {pole.wires.map(wire => (
              <SubtitleBox key={wire.id} color={wire.color}>{wire.label}</SubtitleBox>
            ))}
          </>
        )}

        {/* Span Guy */}
        {pole.spanGuys && pole.spanGuys.length > 0 && (
          <>
            <SectionTitle title="Span Guy" />
            {pole.spanGuys.map(sg => (
              <SubtitleBox key={sg.id} color={sg.color}>{sg.label}</SubtitleBox>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
