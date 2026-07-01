import { useMemo, useRef, useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { Pole } from '../../types';
import { cn } from '../../lib/utils';
import {
  IMG_ASPECT, placePoles, buildAdjacency, shortestPath,
  type GraphEdge,
} from './poleGraph';

type MarkerStatus = 'pass' | 'fail' | 'warning' | 'unverified';

function statusOf(pole: Pole): MarkerStatus {
  const results = pole.validationResults ?? [];
  if (results.length === 0) return 'unverified';
  if (results.some(r => r.status === 'fail')) return 'fail';
  if (results.some(r => r.status === 'warning')) return 'warning';
  return 'pass';
}

const MARKER_STYLE: Record<MarkerStatus, { bg: string; ring: string }> = {
  pass:       { bg: '#1fa163', ring: 'rgba(31,161,99,0.35)' },
  fail:       { bg: '#dc2626', ring: 'rgba(220,38,38,0.35)' },
  warning:    { bg: '#eab308', ring: 'rgba(234,179,8,0.4)' },
  unverified: { bg: '#9ea2aa', ring: 'rgba(158,162,170,0.35)' },
};

// Single span colour for the main runs (status is intentionally not encoded
// here). Service-drop connections use a distinct yellow.
const SPAN_COLOR = '#f0a92b';
const DROP_COLOR = '#facc15';

// Deterministic pseudo-random in [0,1) so service-drop fans look organic but
// stay stable across renders.
function seeded(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface PlacedPole {
  pole: Pole;
  status: MarkerStatus;
  x: number;
  y: number;
}

interface Segment {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface MapMarkersProps {
  poles: Pole[];
  selectedPoleId: string | null;
  onSelectPole: (id: string) => void;
  /** Counter-scale applied to markers so pins stay a constant size while zooming. */
  markerScale?: number;
  /** When true, clicking markers builds the multi-select set instead of opening details. */
  selectionEnabled?: boolean;
  /** Currently multi-selected pole ids (shared with the left panel checkboxes). */
  selectedIds?: Set<string>;
  /** Emits the next multi-select set after a click / shift-range click. */
  onMultiSelect?: (next: Set<string>) => void;
}

export function MapMarkers({
  poles, selectedPoleId, onSelectPole, markerScale = 1,
  selectionEnabled = false, selectedIds, onMultiSelect,
}: MapMarkersProps) {
  const { placed, segments, drops, adjacency } = useMemo(() => {
    if (poles.length === 0) {
      return {
        placed: [] as PlacedPole[], segments: [] as Segment[],
        drops: [] as Segment[], adjacency: new Map<string, GraphEdge[]>(),
      };
    }

    const { routes, positions, routeGroups } = placePoles(poles);

    const placed: PlacedPole[] = [];
    const segments: Segment[] = [];
    const drops: Segment[] = [];

    // Service drops: a fan of lines reaches out to the homes on both sides of the
    // street (varying angle + length so it looks organic). Reach is perpendicular
    // to the run, so vertical runs fan sideways and horizontal runs fan up/down.
    const DROPS_PER_SIDE = 3;
    const DROP_SCALE = 1 / 6; // overall length of the service drops (halved for the 2× image)

    let seedBase = 0;
    for (const route of routes) {
      const rPlaced: PlacedPole[] = route.points.map(pt => ({
        pole: pt.pole, status: statusOf(pt.pole), x: pt.x, y: pt.y,
      }));

      // Connect consecutive poles within this run.
      for (let i = 0; i < rPlaced.length - 1; i++) {
        const a = rPlaced[i];
        const b = rPlaced[i + 1];
        segments.push({ key: `${a.pole.id}-${b.pole.id}`, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      }

      rPlaced.forEach((node, i) => {
        for (const side of [-1, 1] as const) {
          for (let k = 0; k < DROPS_PER_SIDE; k++) {
            const r1 = seeded(seedBase + i * 13 + k * 3 + (side > 0 ? 100 : 0));
            const r2 = seeded(seedBase + i * 17 + k * 5 + (side > 0 ? 200 : 0));
            const reach = (4 + r1 * 3.5) * DROP_SCALE;                              // out to a house
            const spread = ((k - (DROPS_PER_SIDE - 1) / 2) * 3.2 + (r2 - 0.5) * 2) * DROP_SCALE; // fan
            const dx = route.axis === 'v' ? side * reach : spread;
            const dy = route.axis === 'v' ? spread : side * reach;
            drops.push({
              key: `drop-${node.pole.id}-${side}-${k}`,
              x1: node.x, y1: node.y,
              x2: node.x + dx, y2: node.y + dy,
            });
          }
        }
      });

      placed.push(...rPlaced);
      seedBase += 1000;
    }

    const adjacency = buildAdjacency(routeGroups, positions);

    return { placed, segments, drops, adjacency };
  }, [poles]);

  // Anchor pole for shift-range selection (the last plainly-clicked pole).
  const anchorRef = useRef<string | null>(null);

  const handleMarkerClick = (id: string, shiftKey: boolean) => {
    if (!selectionEnabled) {
      onSelectPole(id);
      return;
    }
    const current = selectedIds ?? new Set<string>();

    // Shift-click: trace the shortest path along the strands from the anchor to
    // this pole and select everything on it (works within and across strands).
    if (shiftKey && anchorRef.current && anchorRef.current !== id) {
      const path = shortestPath(adjacency, anchorRef.current, id);
      if (path) {
        const next = new Set(current);
        path.forEach(pid => next.add(pid));
        onMultiSelect?.(next);
        anchorRef.current = id;
        return;
      }
    }

    // Plain click: toggle this pole and make it the new anchor.
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onMultiSelect?.(next);
    anchorRef.current = id;
  };

  // Track the map area's size so we can mirror the <img object-cover> crop and
  // keep markers anchored to the image rather than the container.
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      setSize({ w: cr.width, h: cr.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The rect (within the map area) that the cover-fitted image actually occupies.
  const cover = useMemo(() => {
    const { w, h } = size;
    if (!w || !h) return null;
    let sw: number, sh: number;
    if (w / h > IMG_ASPECT) { sw = w; sh = w / IMG_ASPECT; }
    else { sh = h; sw = h * IMG_ASPECT; }
    return { left: (w - sw) / 2, top: (h - sh) / 2, width: sw, height: sh };
  }, [size]);

  if (placed.length === 0) return <div ref={rootRef} className="absolute inset-0 z-10" />;

  return (
    <div ref={rootRef} className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
      {cover && (
      <div
        className="absolute"
        style={{ left: cover.left, top: cover.top, width: cover.width, height: cover.height }}
      >
      {/* Span lines */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {drops.map(s => (
          <line
            key={s.key}
            x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke={DROP_COLOR}
            strokeWidth={0.55}
            strokeLinecap="round"
            opacity={0.8}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {segments.map(s => (
          <line
            key={s.key}
            x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke={SPAN_COLOR}
            strokeWidth={1.25}
            strokeLinecap="round"
            opacity={0.9}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* Pole markers */}
      {placed.map(node => (
        <PoleMarker
          key={node.pole.id}
          node={node}
          selected={node.pole.id === selectedPoleId}
          multiSelected={selectedIds?.has(node.pole.id) ?? false}
          onSelect={shiftKey => handleMarkerClick(node.pole.id, shiftKey)}
          markerScale={markerScale}
        />
      ))}
      </div>
      )}
    </div>
  );
}

function PoleMarker({
  node, selected, multiSelected, onSelect, markerScale,
}: {
  node: PlacedPole;
  selected: boolean;
  multiSelected: boolean;
  onSelect: (shiftKey: boolean) => void;
  markerScale: number;
}) {
  const style = MARKER_STYLE[node.status];
  const isUnverified = node.status === 'unverified';
  const highlighted = selected || multiSelected;

  return (
    <button
      type="button"
      onClick={e => onSelect(e.shiftKey)}
      onMouseDown={e => e.stopPropagation()}
      title={node.pole.poleNumber}
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        // Counter-scale so the pin stays a constant on-screen size at any zoom.
        transform: `translate(-50%, -50%) scale(${markerScale * (highlighted ? 1.15 : 1)})`,
        transformOrigin: 'center',
      }}
      className={cn(
        'pointer-events-auto absolute',
        'flex items-center justify-center rounded-full border-2 border-white shadow-md',
        'focus:outline-none',
        highlighted ? 'z-30' : 'z-20',
        isUnverified ? 'w-[16px] h-[16px]' : 'w-[22px] h-[22px]',
      )}
    >
      {/* Selection halo — blue for the active (details) pole, accent for multi-select */}
      {highlighted && (
        <span
          className="absolute -inset-[5px] rounded-full border-2"
          style={
            selected
              ? { borderColor: '#5c5ce8', boxShadow: '0 0 0 3px rgba(92,92,232,0.25)' }
              : { borderColor: '#363687', boxShadow: '0 0 0 3px rgba(54,54,135,0.25)' }
          }
        />
      )}
      <span
        className="flex items-center justify-center w-full h-full rounded-full"
        style={{ backgroundColor: style.bg, boxShadow: `0 0 0 3px ${style.ring}` }}
      >
        {node.status === 'pass' && <Check size={13} strokeWidth={3} className="text-white" />}
        {node.status === 'fail' && <X size={13} strokeWidth={3} className="text-white" />}
        {node.status === 'warning' && (
          <span className="text-white text-[12px] font-bold leading-none">!</span>
        )}
      </span>
    </button>
  );
}
