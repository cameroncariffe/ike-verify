import { useMemo, useRef, useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { Pole } from '../../types';
import { cn } from '../../lib/utils';

// Intrinsic aspect of the satellite image (1920×1080), used to mirror the
// <img object-cover> crop so markers stay locked to features in the image.
const IMG_ASPECT = 1920 / 1080;

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

// Authored centrelines of the alleys in the satellite image, as percentages of
// the map area. Poles are distributed evenly along these paths so they sit in
// the streets rather than being projected from raw lat/lng (which won't align to
// a static image). Tweak these points if the underlying image changes.
// Coordinates are in % of the satellite image. The image shows 2× the area of
// the originally-tuned framing (same centre), so the previous alley alignment is
// remapped as x' = 25 + x/2, y' = 25 + y/2 (the old frame is the central 50%).
type Axis = 'v' | 'h';
const ROAD_PATH: { x: number; y: number }[] = [
  { x: 47.4, y: 31.5 },
  { x: 47.4, y: 41.5 },
  { x: 47.4, y: 51.5 },
  { x: 47.4, y: 61.5 },
  { x: 47.4, y: 71.0 },
];

// New pole runs (vertical east branch + a horizontal cross street). These
// consume poles from the END of the list, so the original run keeps the main
// alley while newly-added poles populate the branches. The cross line's right
// end shares the corner with the east branch's bottom.
const RIGHT_PATH: { x: number; y: number }[] = [
  { x: 52.0, y: 45.0 },
  { x: 52.0, y: 58.5 },
];
const CROSS_PATH: { x: number; y: number }[] = [
  { x: 43.5, y: 58.5 },
  { x: 52.0, y: 58.5 },
];

const BRANCH_ROUTES: { id: string; path: { x: number; y: number }[]; axis: Axis; count: number }[] = [
  { id: 'east', path: RIGHT_PATH, axis: 'v', count: 7 },
  { id: 'cross', path: CROSS_PATH, axis: 'h', count: 7 },
];

// Deterministic pseudo-random in [0,1) so service-drop fans look organic but
// stay stable across renders.
function seeded(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Return the point at fraction `t` (0–1) along a polyline, by arc length.
function pointAlongPath(path: { x: number; y: number }[], t: number) {
  if (path.length === 1) return path[0];
  const segLengths = path.slice(0, -1).map((p, i) =>
    Math.hypot(path[i + 1].x - p.x, path[i + 1].y - p.y)
  );
  const total = segLengths.reduce((a, b) => a + b, 0) || 1;
  let target = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 0; i < segLengths.length; i++) {
    if (target <= segLengths[i] || i === segLengths.length - 1) {
      const f = segLengths[i] === 0 ? 0 : target / segLengths[i];
      return {
        x: path[i].x + (path[i + 1].x - path[i].x) * f,
        y: path[i].y + (path[i + 1].y - path[i].y) * f,
      };
    }
    target -= segLengths[i];
  }
  return path[path.length - 1];
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
}

export function MapMarkers({ poles, selectedPoleId, onSelectPole, markerScale = 1 }: MapMarkersProps) {
  const { placed, segments, drops } = useMemo(() => {
    if (poles.length === 0) {
      return { placed: [] as PlacedPole[], segments: [] as Segment[], drops: [] as Segment[] };
    }

    // Partition the list across routes. Branches take poles from the end of the
    // list (newly-added poles); the main alley keeps the original run.
    const branchTotal = BRANCH_ROUTES.reduce((a, b) => a + b.count, 0);
    const mainCount = Math.max(0, poles.length - branchTotal);
    const routes: { path: { x: number; y: number }[]; axis: Axis; poles: Pole[] }[] = [
      { path: ROAD_PATH, axis: 'v', poles: poles.slice(0, mainCount) },
    ];
    let cursor = mainCount;
    for (const b of BRANCH_ROUTES) {
      routes.push({ path: b.path, axis: b.axis, poles: poles.slice(cursor, cursor + b.count) });
      cursor += b.count;
    }

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
      const n = route.poles.length;
      const rPlaced: PlacedPole[] = route.poles.map((p, i) => {
        const t = n > 1 ? i / (n - 1) : 0.5;
        const { x, y } = pointAlongPath(route.path, t);
        return { pole: p, status: statusOf(p), x, y };
      });

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

    return { placed, segments, drops };
  }, [poles]);

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
          onSelect={() => onSelectPole(node.pole.id)}
          markerScale={markerScale}
        />
      ))}
      </div>
      )}
    </div>
  );
}

function PoleMarker({
  node, selected, onSelect, markerScale,
}: {
  node: PlacedPole;
  selected: boolean;
  onSelect: () => void;
  markerScale: number;
}) {
  const style = MARKER_STYLE[node.status];
  const isUnverified = node.status === 'unverified';

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseDown={e => e.stopPropagation()}
      title={node.pole.poleNumber}
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        // Counter-scale so the pin stays a constant on-screen size at any zoom.
        transform: `translate(-50%, -50%) scale(${markerScale * (selected ? 1.15 : 1)})`,
        transformOrigin: 'center',
      }}
      className={cn(
        'pointer-events-auto absolute',
        'flex items-center justify-center rounded-full border-2 border-white shadow-md',
        'focus:outline-none',
        selected ? 'z-30' : 'z-20',
        isUnverified ? 'w-[16px] h-[16px]' : 'w-[22px] h-[22px]',
      )}
    >
      {/* Selection halo */}
      {selected && (
        <span
          className="absolute -inset-[5px] rounded-full border-2"
          style={{ borderColor: '#5c5ce8', boxShadow: '0 0 0 3px rgba(92,92,232,0.25)' }}
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
