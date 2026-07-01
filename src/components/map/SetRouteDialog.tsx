import { useState, useEffect, useMemo } from 'react';
import { Flag, MapPin, Route as RouteIcon } from 'lucide-react';
import type { Pole, MapRoute } from '../../types';
import { orderStrand } from './poleGraph';
import { cn } from '../../lib/utils';

interface SetRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poles: Pole[];
  selectedIds: Set<string>;
  onSave: (route: Omit<MapRoute, 'id' | 'createdAt'>) => void;
}

export function SetRouteDialog({ open, onOpenChange, poles, selectedIds, onSave }: SetRouteDialogProps) {
  const strand = useMemo(() => orderStrand(poles, selectedIds), [poles, selectedIds]);
  const poleById = useMemo(() => new Map(poles.map(p => [p.id, p])), [poles]);

  const [name, setName] = useState('');
  const [startPoleId, setStartPoleId] = useState<string>('');

  // Reset the form each time the dialog opens, defaulting the start to the first endpoint.
  useEffect(() => {
    if (open) {
      setName('');
      setStartPoleId(strand?.endpoints[0] ?? '');
    }
  }, [open, strand]);

  if (!open) return null;

  const close = () => onOpenChange(false);

  // Order the poles from the chosen start endpoint to the other end.
  const orderedFromStart = strand
    ? (startPoleId === strand.endpoints[1] ? [...strand.ordered].reverse() : strand.ordered)
    : [];
  const endId = orderedFromStart[orderedFromStart.length - 1];

  const canSave = !!name.trim() && !!strand && orderedFromStart.length >= 2;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ name: name.trim(), poleIds: orderedFromStart, startPoleId });
    close();
  };

  const label = (id: string) => poleById.get(id)?.poleNumber ?? id;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="w-[520px] max-w-full flex flex-col gap-5 p-8 rounded-xl border border-[#e5e5e5] bg-white shadow-[0px_10px_15px_rgba(0,0,0,0.1),0px_4px_6px_rgba(0,0,0,0.1)]">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 font-semibold text-xl leading-6 text-[#0a0a0a]">
            <RouteIcon size={20} className="text-[#363687]" /> Set route
          </h2>
          <p className="text-xs text-[#737373]">
            {strand
              ? <>Define a route across <span className="font-medium text-[#3c404d]">{orderedFromStart.length} poles</span>. Choose the start point and name it.</>
              : 'Select at least two connected poles to define a route.'}
          </p>
        </div>

        {strand && (
          <>
            {/* Name */}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#0a0a0a]">Route name</span>
              <input
                type="text"
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                placeholder="e.g. Main St – north run"
                className="w-full h-9 px-3 text-sm rounded-lg border border-[#e5e5e5] bg-white text-[#0a0a0a] outline-none focus:border-[#363687] placeholder:text-[#737373] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]"
              />
            </label>

            {/* Start endpoint picker */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#0a0a0a]">Start point</span>
              <div className="grid grid-cols-2 gap-2">
                {strand.endpoints.map(id => {
                  const active = startPoleId === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setStartPoleId(id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors',
                        active
                          ? 'border-[#363687] bg-[#363687]/5 ring-1 ring-[#363687]'
                          : 'border-[#e5e5e5] bg-white hover:bg-neutral-50'
                      )}
                    >
                      <span className={cn(
                        'flex items-center justify-center w-6 h-6 rounded-full shrink-0',
                        active ? 'bg-[#363687] text-white' : 'bg-[#f0f0f0] text-[#737373]'
                      )}>
                        <Flag size={13} />
                      </span>
                      <span className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-[#0a0a0a] truncate">Pole {label(id)}</span>
                        <span className="text-[11px] text-[#737373]">{active ? 'Start' : 'Set as start'}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ordered pole list */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#0a0a0a]">Poles in route</span>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-[#e5e5e5] divide-y divide-[#f0f0f0]">
                {orderedFromStart.map((id, i) => {
                  const isStart = id === startPoleId;
                  const isEnd = id === endId;
                  return (
                    <div key={id} className="flex items-center gap-2.5 px-3 py-2">
                      <span className="w-5 text-[11px] tabular-nums text-[#9ea2aa] text-right shrink-0">{i + 1}</span>
                      <MapPin size={14} className={cn('shrink-0', isStart ? 'text-[#363687]' : isEnd ? 'text-[#1fa163]' : 'text-[#c9cdd2]')} />
                      <span className="flex-1 min-w-0 text-sm text-[#3c404d] truncate">Pole {label(id)}</span>
                      {isStart && <EndpointBadge kind="start" />}
                      {isEnd && !isStart && <EndpointBadge kind="end" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="flex items-center justify-end gap-2 w-full">
          <DialogButton variant="outline" onClick={close}>Cancel</DialogButton>
          <DialogButton variant="primary" onClick={handleSave} disabled={!canSave}>Save route</DialogButton>
        </div>
      </div>
    </div>
  );
}

function EndpointBadge({ kind }: { kind: 'start' | 'end' }) {
  return (
    <span className={cn(
      'shrink-0 text-[10px] font-semibold rounded-full px-1.5 py-px',
      kind === 'start' ? 'bg-[#363687] text-white' : 'bg-[#1fa163] text-white'
    )}>
      {kind === 'start' ? 'Start' : 'End'}
    </span>
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
