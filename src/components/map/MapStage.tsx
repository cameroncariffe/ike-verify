import { useRef, useState, useEffect, useCallback } from 'react';
import { MapView } from './MapView';
import { MapMarkers } from './MapMarkers';
import type { Pole } from '../../types';
import { cn } from '../../lib/utils';

// The satellite image holds 2× the framed area, so a base scale of 2 makes the
// default view (zoom = 1) match the originally-framed alley. Zooming out to 0.5
// reveals the full image (~2× the area); zooming in to 2 doubles magnification.
const BASE_SCALE = 2;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;

interface MapStageProps {
  poles: Pole[];
  selectedPoleId: string | null;
  onSelectPole: (id: string) => void;
  /** When false, drag-pan and wheel-zoom are disabled (non-hand tools). */
  interactive?: boolean;
  /** When true, marker clicks build the multi-select set (pointer select tool). */
  selectionEnabled?: boolean;
  selectedIds?: Set<string>;
  onMultiSelect?: (next: Set<string>) => void;
}

export function MapStage({
  poles, selectedPoleId, onSelectPole, interactive = true,
  selectionEnabled = false, selectedIds, onMultiSelect,
}: MapStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  const displayScale = BASE_SCALE * zoom;

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

  // Keep the panned content covering the viewport (no gaps at the edges).
  const clampPan = useCallback((p: { x: number; y: number }, scale: number) => {
    const maxX = Math.max(0, ((scale - 1) / 2) * size.w);
    const maxY = Math.max(0, ((scale - 1) / 2) * size.h);
    return {
      x: Math.min(maxX, Math.max(-maxX, p.x)),
      y: Math.min(maxY, Math.max(-maxY, p.y)),
    };
  }, [size]);

  useEffect(() => {
    setPan(p => clampPan(p, displayScale));
  }, [displayScale, clampPan]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!interactive || e.button !== 0) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setPan(clampPan({ x: d.px + (e.clientX - d.sx), y: d.py + (e.clientY - d.sy) }, displayScale));
    };
    const onUp = () => { setDragging(false); dragRef.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, displayScale, clampPan]);

  // Scroll-wheel zoom, anchored to the cursor position.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !interactive) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (size.w === 0) return;

      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = size.w / 2;
      const cy = size.h / 2;
      const zoomDelta = -e.deltaY * 0.0015;

      setZoom(prevZoom => {
        const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prevZoom + zoomDelta));
        if (Math.abs(nextZoom - prevZoom) < 0.001) return prevZoom;

        const oldScale = BASE_SCALE * prevZoom;
        const newScale = BASE_SCALE * nextZoom;

        setPan(prevPan => {
          const px = mx - cx - (mx - prevPan.x - cx) * (newScale / oldScale);
          const py = my - cy - (my - prevPan.y - cy) * (newScale / oldScale);
          return clampPan({ x: px, y: py }, newScale);
        });

        return +nextZoom.toFixed(3);
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [size, clampPan, interactive]);

  return (
    <div
      ref={rootRef}
      onMouseDown={onMouseDown}
      className={cn(
        'absolute inset-0 overflow-hidden',
        interactive ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
      )}
    >
      {/* Pan layer */}
      <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
        {/* Zoom layer */}
        <div
          className="absolute inset-0"
          style={{ transform: `scale(${displayScale})`, transformOrigin: '50% 50%' }}
        >
          <MapView />
          <MapMarkers
            poles={poles}
            selectedPoleId={selectedPoleId}
            onSelectPole={onSelectPole}
            markerScale={1 / displayScale}
            selectionEnabled={selectionEnabled}
            selectedIds={selectedIds}
            onMultiSelect={onMultiSelect}
          />
        </div>
      </div>
    </div>
  );
}
