import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Info, ChevronDown, Eye, Pencil,
  X, CheckCircle2, AlertCircle, AlertTriangle, HelpCircle
} from 'lucide-react';
import type { Pole, ValidationStatus } from '../../types';
import { ValidationBadge } from '../ui/ValidationBadge';
import { cn } from '../../lib/utils';

interface PoleDetailsPanelProps {
  pole: Pole | null;
  showResults: boolean;
  onToggleResults: () => void;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
  onClose: () => void;
}

function DetailRow({
  label,
  value,
  dimmed = false,
  hasInfo = false,
}: {
  label: string;
  value?: string | number;
  dimmed?: boolean;
  hasInfo?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 min-h-6 pt-0.5">
      <div className="flex items-center gap-1 w-48 shrink-0">
        <span className={cn(
          'text-sm leading-5 whitespace-nowrap',
          dimmed ? 'font-semibold text-neutral-400' : 'font-semibold text-neutral-700'
        )}>
          {label}
        </span>
        {hasInfo && (
          <Info size={12} className="text-neutral-400 shrink-0" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className={cn(
          'text-sm leading-5',
          dimmed ? 'text-neutral-400' : 'text-neutral-700'
        )}>
          {value ?? '–'}
        </span>
      </div>
    </div>
  );
}

const statusIcons: Record<ValidationStatus, React.ReactNode> = {
  pass:    <CheckCircle2 size={14} className="text-[#1fa163] shrink-0" />,
  fail:    <AlertCircle   size={14} className="text-[#b91c1c] shrink-0" />,
  warning: <AlertTriangle size={14} className="text-[#a16207] shrink-0" />,
  review:  <HelpCircle    size={14} className="text-[#1d4ed8] shrink-0" />,
  pending: <HelpCircle    size={14} className="text-neutral-400 shrink-0" />,
};

export function PoleDetailsPanel({
  pole,
  showResults,
  onToggleResults,
  onPrev,
  onNext,
  canPrev,
  canNext,
  onClose,
}: PoleDetailsPanelProps) {
  const [equipmentOpen, setEquipmentOpen] = useState(true);

  if (!pole) {
    return (
      <aside className="w-[520px] shrink-0 flex flex-col border-l border-neutral-200 bg-white">
        <div
          className="flex items-center px-3 h-12 border-b border-white/20 shrink-0"
          style={{ background: '#363687' }}
        >
          <span className="font-barlow font-semibold text-white text-base flex-1">
            Pole details
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center text-neutral-400 text-sm">
          Select a pole to view details
        </div>
      </aside>
    );
  }

  const results = pole.validationResults ?? [];
  const totalFail = results.filter(r => r.status === 'fail').length;
  const totalWarn = results.filter(r => r.status === 'warning').length;
  const totalPass = results.filter(r => r.status === 'pass').length;
  const totalReview = results.filter(r => r.status === 'review').length;

  return (
    <aside className="w-[520px] shrink-0 flex flex-col border-l border-neutral-200 bg-white overflow-hidden">
      {/* Header row 1: Title */}
      <div
        className="flex items-center px-3 h-12 border-b border-white/20 shrink-0"
        style={{ background: '#363687' }}
      >
        <span className="font-barlow font-semibold text-white text-base flex-1">
          Pole details
        </span>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-1">
          <X size={16} />
        </button>
      </div>

      {/* Header row 2: Pole nav + actions */}
      <div
        className="flex items-center gap-3 px-3 h-12 border-b border-white/20 shrink-0"
        style={{ background: '#363687' }}
      >
        {/* Prev/Next */}
        <div className="flex items-center gap-1">
          <button
            disabled={!canPrev}
            onClick={onPrev}
            className="p-1 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            disabled={!canNext}
            onClick={onNext}
            className="p-1 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Pole number + edit icon */}
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-white/70" />
          <Pencil size={16} className="text-white/70" />
        </div>

        <span className="font-barlow font-semibold text-white text-base flex-1">
          {pole.poleNumber}
        </span>

        {/* Show results toggle */}
        <button
          onClick={onToggleResults}
          className="flex items-center gap-2 text-white text-sm"
        >
          <div className={cn(
            'relative w-8 h-[18px] rounded-full transition-colors',
            showResults ? 'bg-[#4ade80]' : 'bg-white/30'
          )}>
            <div className={cn(
              'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all',
              showResults ? 'left-[18px]' : 'left-0.5'
            )} />
          </div>
          <span className="whitespace-nowrap text-xs">Show results</span>
        </button>

        <div className="flex items-center gap-1">
          <button className="text-white/70 hover:text-white transition-colors">
            <Info size={18} />
          </button>
          <button className="text-white/70 hover:text-white transition-colors">
            <ChevronDown size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-2">

        {/* Validation Results (shown when toggle is on) */}
        {showResults && results.length > 0 && (
          <div className="mb-4 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-700">Validation Results</span>
              <div className="flex items-center gap-1">
                {totalFail > 0 && <ValidationBadge status="fail" count={totalFail} />}
                {totalWarn > 0 && <ValidationBadge status="warning" count={totalWarn} />}
                {totalReview > 0 && <ValidationBadge status="review" count={totalReview} />}
                {totalPass > 0 && <ValidationBadge status="pass" count={totalPass} />}
              </div>
            </div>
            <div className="space-y-1.5">
              {results.map(r => (
                <div key={r.ruleId} className="flex items-start gap-2">
                  {statusIcons[r.status]}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-neutral-700">{r.ruleName}</span>
                    {r.message && (
                      <p className="text-[11px] text-neutral-500 mt-0.5">{r.message}</p>
                    )}
                  </div>
                  <ValidationBadge status={r.status} size="sm" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pole attributes */}
        <DetailRow label="Status" value={pole.status} />
        <DetailRow label="OP#" value={pole.opNumber} />
        <DetailRow label="Id" value={pole.externalId} />
        <DetailRow label="Tag Photos" value={pole.tagPhotos} dimmed={!pole.tagPhotos} />
        <DetailRow label="Type" value={pole.type} />
        <DetailRow label="Owner" value={pole.owner} />
        <DetailRow label={'Circumference (")'} value={pole.circumference} dimmed={!pole.circumference} />
        <DetailRow label="Tip" value={pole.tip} />
        <DetailRow
          label="Location"
          value={`Latitude: ${pole.location.lat}\nLongitude: ${pole.location.lng}\nAltitude: ${pole.location.altitude}`}
          hasInfo
        />
        <DetailRow label="Note" value={pole.note} dimmed={!pole.note} />
        <DetailRow label="PLA Result" value={pole.plaResult} dimmed={!pole.plaResult} />
        <DetailRow label="IKEphoto" value={pole.ikePhoto} hasInfo />
        <DetailRow label="Mid Span IKEphoto" value={pole.midSpanIkePhoto} dimmed={!pole.midSpanIkePhoto} />
        <DetailRow label="Comm to LCE (Evergy)" value={pole.commToLce} />
        <DetailRow label="Comm to Comm (Evergy)" value={pole.commToComm} />
        <DetailRow label="Comm to STLT (NESC)" value={pole.commToStlt} dimmed={!pole.commToStlt} />

        {/* Lowest Controlling Electrical */}
        <div className="pt-2">
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
            Lowest Controlling Electrical
          </span>
        </div>

        {/* Make Ready */}
        {pole.makeReady && pole.makeReady.length > 0 && (
          <div className="mt-2">
            <span className="text-sm font-semibold text-neutral-700">
              Make Ready {pole.makeReady.length}
            </span>
            {pole.makeReady.map(mr => (
              <div
                key={mr.id}
                className="mt-1.5 p-2 bg-neutral-50 border border-neutral-200 rounded text-xs text-neutral-600 leading-relaxed"
              >
                {mr.description}
              </div>
            ))}
          </div>
        )}

        {/* Equipment */}
        {pole.equipment && pole.equipment.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setEquipmentOpen(o => !o)}
              className="flex items-center gap-1 text-sm font-semibold text-neutral-700"
            >
              {equipmentOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Equipment
            </button>
            {equipmentOpen && (
              <div className="mt-1.5 border border-neutral-200 rounded overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200">
                      <th className="text-left px-2 py-1.5 font-semibold text-neutral-500">Type</th>
                      <th className="text-left px-2 py-1.5 font-semibold text-neutral-500">Owner</th>
                      <th className="text-right px-2 py-1.5 font-semibold text-neutral-500">Height</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pole.equipment.map((eq, i) => (
                      <tr key={eq.id} className={cn(i % 2 === 0 ? '' : 'bg-neutral-50')}>
                        <td className="px-2 py-1.5 text-neutral-700">{eq.type}</td>
                        <td className="px-2 py-1.5 text-neutral-600">{eq.owner}</td>
                        <td className="px-2 py-1.5 text-neutral-700 text-right">{eq.height ?? '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
