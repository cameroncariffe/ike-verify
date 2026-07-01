import type { Pole } from '../../types';

// Intrinsic aspect of the satellite image (1920×1080), used to mirror the
// <img object-cover> crop so markers stay locked to features in the image.
export const IMG_ASPECT = 1920 / 1080;

export type Axis = 'v' | 'h';

// Authored centrelines of the alleys in the satellite image, as percentages of
// the map area. Poles are distributed evenly along these paths so they sit in
// the streets rather than being projected from raw lat/lng.
export const ROAD_PATH: { x: number; y: number }[] = [
  { x: 47.9, y: 31.5 },
  { x: 47.9, y: 41.5 },
  { x: 47.9, y: 51.5 },
  { x: 47.9, y: 61.5 },
  { x: 47.9, y: 71.0 },
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

export const BRANCH_ROUTES: { id: string; path: { x: number; y: number }[]; axis: Axis; count: number }[] = [
  { id: 'east', path: RIGHT_PATH, axis: 'v', count: 7 },
  { id: 'cross', path: CROSS_PATH, axis: 'h', count: 7 },
];

// Return the point at fraction `t` (0–1) along a polyline, by arc length.
export function pointAlongPath(path: { x: number; y: number }[], t: number) {
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

export interface PlacedPoint {
  pole: Pole;
  x: number;
  y: number;
}

export interface PlacedRoute {
  axis: Axis;
  points: PlacedPoint[];
}

export interface PlacedResult {
  routes: PlacedRoute[];
  /** Pole positions keyed by id. */
  positions: Map<string, { x: number; y: number }>;
  /** Pole ids grouped by strand, in spatial order. */
  routeGroups: string[][];
}

/**
 * Distribute the pole list across the authored strands. The main alley keeps
 * the original run; branch strands consume poles from the end of the list.
 */
export function placePoles(poles: Pole[]): PlacedResult {
  const routes: PlacedRoute[] = [];
  const positions = new Map<string, { x: number; y: number }>();
  const routeGroups: string[][] = [];

  if (poles.length === 0) return { routes, positions, routeGroups };

  const branchTotal = BRANCH_ROUTES.reduce((a, b) => a + b.count, 0);
  const mainCount = Math.max(0, poles.length - branchTotal);

  const defs: { path: { x: number; y: number }[]; axis: Axis; poles: Pole[] }[] = [
    { path: ROAD_PATH, axis: 'v', poles: poles.slice(0, mainCount) },
  ];
  let cursor = mainCount;
  for (const b of BRANCH_ROUTES) {
    defs.push({ path: b.path, axis: b.axis, poles: poles.slice(cursor, cursor + b.count) });
    cursor += b.count;
  }

  for (const def of defs) {
    const n = def.poles.length;
    const points: PlacedPoint[] = def.poles.map((p, i) => {
      const t = n > 1 ? i / (n - 1) : 0.5;
      const { x, y } = pointAlongPath(def.path, t);
      positions.set(p.id, { x, y });
      return { pole: p, x, y };
    });
    routes.push({ axis: def.axis, points });
    routeGroups.push(points.map(pt => pt.pole.id));
  }

  return { routes, positions, routeGroups };
}

export interface GraphEdge {
  id: string;
  w: number;
}

/**
 * Connectivity graph: poles link to neighbours within a strand, and strands
 * link at junctions (their closest pole pair, when near enough). Weights are
 * visual distance (x spans more pixels than y on this image).
 */
export function buildAdjacency(
  routeGroups: string[][],
  positions: Map<string, { x: number; y: number }>,
): Map<string, GraphEdge[]> {
  const adjacency = new Map<string, GraphEdge[]>();
  const addEdge = (a: string, b: string) => {
    const pa = positions.get(a)!;
    const pb = positions.get(b)!;
    const w = Math.hypot((pa.x - pb.x) * IMG_ASPECT, pa.y - pb.y);
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a)!.push({ id: b, w });
    adjacency.get(b)!.push({ id: a, w });
  };

  routeGroups.forEach(g => {
    for (let i = 0; i < g.length - 1; i++) addEdge(g[i], g[i + 1]);
  });

  const JUNCTION_MAX = 3;
  for (let a = 0; a < routeGroups.length; a++) {
    for (let b = a + 1; b < routeGroups.length; b++) {
      let best: [string, string] | null = null;
      let bestD = Infinity;
      for (const ia of routeGroups[a]) {
        for (const ib of routeGroups[b]) {
          const pa = positions.get(ia)!;
          const pb = positions.get(ib)!;
          const d = Math.hypot((pa.x - pb.x) * IMG_ASPECT, pa.y - pb.y);
          if (d < bestD) { bestD = d; best = [ia, ib]; }
        }
      }
      if (best && bestD < JUNCTION_MAX) addEdge(best[0], best[1]);
    }
  }

  return adjacency;
}

/**
 * Dijkstra shortest path over the pole connectivity graph. Returns the ordered
 * list of pole ids from `start` to `goal` (inclusive), or null if unreachable.
 */
export function shortestPath(
  adjacency: Map<string, GraphEdge[]>,
  start: string,
  goal: string,
): string[] | null {
  if (start === goal) return [start];
  const dist = new Map<string, number>([[start, 0]]);
  const prev = new Map<string, string>();
  const queue: { id: string; d: number }[] = [{ id: start, d: 0 }];

  while (queue.length) {
    let mi = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i].d < queue[mi].d) mi = i;
    const { id, d } = queue.splice(mi, 1)[0];
    if (id === goal) break;
    if (d > (dist.get(id) ?? Infinity)) continue;
    for (const e of adjacency.get(id) ?? []) {
      const nd = d + e.w;
      if (nd < (dist.get(e.id) ?? Infinity)) {
        dist.set(e.id, nd);
        prev.set(e.id, id);
        queue.push({ id: e.id, d: nd });
      }
    }
  }

  if (!prev.has(goal)) return null;
  const path = [goal];
  let cur = goal;
  while (cur !== start) {
    const p = prev.get(cur);
    if (p == null) return null;
    path.push(p);
    cur = p;
  }
  return path.reverse();
}

export interface OrderedStrand {
  /** Selected pole ids ordered from one endpoint to the other. */
  ordered: string[];
  /** The two ends of the strand. */
  endpoints: [string, string];
}

/**
 * Order a set of selected poles into a strand and identify its two endpoints.
 * Uses the connectivity graph: endpoints are the selected poles with a single
 * selected neighbour. Falls back to list order for non-path selections.
 */
export function orderStrand(poles: Pole[], selectedIds: Set<string>): OrderedStrand | null {
  if (selectedIds.size < 2) return null;
  const { positions, routeGroups } = placePoles(poles);
  const adjacency = buildAdjacency(routeGroups, positions);

  // Adjacency restricted to the selected poles.
  const subAdj = new Map<string, string[]>();
  for (const id of selectedIds) {
    const nbrs = (adjacency.get(id) ?? []).map(e => e.id).filter(n => selectedIds.has(n));
    subAdj.set(id, nbrs);
  }

  const listOrder = poles.map(p => p.id).filter(id => selectedIds.has(id));
  const fallback = (): OrderedStrand => ({
    ordered: listOrder,
    endpoints: [listOrder[0], listOrder[listOrder.length - 1]],
  });

  // Endpoints of a simple path have exactly one selected neighbour.
  const ends = [...selectedIds].filter(id => (subAdj.get(id)?.length ?? 0) <= 1);
  const start = ends[0] ?? listOrder[0];

  const ordered: string[] = [];
  const visited = new Set<string>();
  let cur: string | undefined = start;
  while (cur && !visited.has(cur)) {
    ordered.push(cur);
    visited.add(cur);
    cur = (subAdj.get(cur) ?? []).find(n => !visited.has(n));
  }

  // If traversal didn't reach every selected pole, the selection isn't a clean
  // path (disconnected or branched) — fall back to list order.
  if (ordered.length !== selectedIds.size) return fallback();

  return { ordered, endpoints: [ordered[0], ordered[ordered.length - 1]] };
}
