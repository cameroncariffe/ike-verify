import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Expand, Shrink,
  Ruler, RulerDimensionLine, ZoomIn, ZoomOut, Maximize2,
  SunDim, Sun, SunMoon, Locate, Info, EyeOff, Trash2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Pole } from '../../types';

const PLACEHOLDER_POLE = '/pole-3973.png';
const PLACEHOLDER_SPAN = '/pole-span.png';
const PLACEHOLDER_NEXT = '/pole-3975.png';

interface PoleImagesProps {
  pole: Pole;
  prevPole: Pole | null;
  nextPole: Pole | null;
  expanded: boolean;
  onToggleExpanded: () => void;
  onSelectPole: (id: string) => void;
  /** Space (px) taken by the overlaid details panel, so the strip centers in view. */
  rightInset?: number;
}

export function PoleImages({
  pole, prevPole, nextPole, expanded, onToggleExpanded, onSelectPole, rightInset = 0,
}: PoleImagesProps) {
  // Which of the three cards is highlighted. The selected pole's card by default.
  const [activeCard, setActiveCard] = useState(0);

  const cards = [
    { key: 'pole', src: PLACEHOLDER_POLE, label: pole.poleNumber },
    { key: 'span', src: PLACEHOLDER_SPAN, label: 'Span' },
    { key: 'next', src: PLACEHOLDER_NEXT, label: nextPole?.poleNumber ?? '—' },
  ];

  const pills = (
    <PolePills
      prev={prevPole}
      current={pole}
      next={nextPole}
      onSelect={onSelectPole}
    />
  );

  if (expanded) {
    return (
      <div className="absolute inset-0 z-30 flex flex-col bg-[#f7f9fc]/80 backdrop-blur-[2px]">
        {/* Top image toolbar */}
        <div className="flex justify-center px-3 pt-2 shrink-0">
          <ImageToolbar />
        </div>

        {/* Large image set */}
        <div className="flex-1 min-h-0 flex gap-2 px-3 py-2">
          {cards.map((c, i) => (
            <ImageCard
              key={c.key}
              src={c.src}
              label={c.label}
              selected={activeCard === i}
              large
              onClick={() => setActiveCard(i)}
            />
          ))}
        </div>

        {/* Bottom nav: pole pills + collapse */}
        <div className="relative flex items-center justify-center h-12 px-3 shrink-0">
          {pills}
          <button
            onClick={onToggleExpanded}
            title="Collapse images"
            className="absolute right-3 flex items-center justify-center w-8 h-8 rounded-lg border border-[#e5e5e5] bg-white text-[#404040] hover:bg-neutral-50 shadow-sm transition-colors"
          >
            <Shrink size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Docked strip centered at the bottom of the visible map area (excluding the
  // overlaid details panel).
  return (
    <div
      className="absolute left-0 bottom-3 z-20 flex flex-col items-center transition-[right] duration-200 ease-out"
      style={{ right: rightInset }}
    >
      <div className="flex flex-col gap-2">
        <div className="flex gap-1.5">
          {cards.map((c, i) => (
            <ImageCard
              key={c.key}
              src={c.src}
              label={c.label}
              selected={activeCard === i}
              onClick={() => setActiveCard(i)}
            />
          ))}
        </div>

        <div className="relative flex items-center justify-center h-8">
          {pills}
          <button
            onClick={onToggleExpanded}
            title="Expand images"
            className="absolute right-0 flex items-center justify-center w-8 h-8 rounded-lg border border-[#e5e5e5] bg-white text-[#404040] hover:bg-neutral-50 shadow-sm transition-colors"
          >
            <Expand size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ImageCard({
  src, label, selected, large = false, onClick,
}: {
  src: string;
  label: string;
  selected: boolean;
  large?: boolean;
  onClick: () => void;
}) {
  const [photo, setPhoto] = useState(1);
  const total = 3;

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex flex-col justify-end overflow-hidden rounded-lg cursor-pointer shadow-md transition-all',
        large ? 'flex-1 min-w-0' : 'w-[176px] h-[240px]',
        selected ? 'border-2 border-[#5c5ce8]' : 'border border-white',
      )}
    >
      <img
        src={src}
        alt={label}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />
      <div className="relative flex items-center gap-2 h-6 px-2 bg-white/70 rounded-b-lg">
        <p className="flex-1 min-w-0 text-center text-sm font-medium text-black truncate">{label}</p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setPhoto(p => (p > 1 ? p - 1 : total)); }}
            className="text-black/80 hover:text-black"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-medium text-black whitespace-nowrap">{photo}/{total}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setPhoto(p => (p < total ? p + 1 : 1)); }}
            className="text-black/80 hover:text-black"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function PolePills({
  prev, current, next, onSelect,
}: {
  prev: Pole | null;
  current: Pole;
  next: Pole | null;
  onSelect: (id: string) => void;
}) {
  const items = [prev, current, next].filter((p): p is Pole => p != null);
  return (
    <div className="flex items-center rounded-md border border-[#e5e5e5] bg-white shadow-sm overflow-hidden">
      {items.map(p => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={cn(
            'px-3 h-8 text-sm font-medium border-r border-[#e5e5e5] last:border-r-0 transition-colors',
            p.id === current.id
              ? 'bg-[#363687] text-white'
              : 'bg-white text-[#404040] hover:bg-neutral-50',
          )}
        >
          {p.poleNumber}
        </button>
      ))}
    </div>
  );
}

type ToolId =
  | 'measure' | 'dimension' | 'zoom-in' | 'zoom-out' | 'fit'
  | 'brightness-low' | 'brightness' | 'brightness-auto'
  | 'locate' | 'info' | 'hide' | 'delete';

function ImageToolbar() {
  const [active, setActive] = useState<ToolId | null>(null);

  const groups: { id: ToolId; icon: React.ReactNode; title: string }[][] = [
    [
      { id: 'measure', icon: <Ruler size={18} />, title: 'Measure' },
      { id: 'dimension', icon: <RulerDimensionLine size={18} />, title: 'Dimension' },
    ],
    [
      { id: 'zoom-in', icon: <ZoomIn size={18} />, title: 'Zoom in' },
      { id: 'zoom-out', icon: <ZoomOut size={18} />, title: 'Zoom out' },
      { id: 'fit', icon: <Maximize2 size={18} />, title: 'Fit to screen' },
    ],
    [
      { id: 'brightness-low', icon: <SunDim size={18} />, title: 'Brightness low' },
      { id: 'brightness', icon: <Sun size={18} />, title: 'Brightness' },
      { id: 'brightness-auto', icon: <SunMoon size={18} />, title: 'Auto brightness' },
    ],
    [
      { id: 'locate', icon: <Locate size={18} />, title: 'Locate' },
      { id: 'info', icon: <Info size={18} />, title: 'Info' },
    ],
    [
      { id: 'hide', icon: <EyeOff size={18} />, title: 'Hide annotations' },
      { id: 'delete', icon: <Trash2 size={18} />, title: 'Delete' },
    ],
  ];

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-white shadow-sm">
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-2">
          {gi > 0 && <div className="w-px h-6 bg-[#2a2f3c]/40" />}
          {group.map(b => (
            <ToolButton
              key={b.id}
              icon={b.icon}
              title={b.title}
              active={active === b.id}
              onClick={() => setActive(a => (a === b.id ? null : b.id))}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function ToolButton({
  icon, active = false, onClick, title,
}: {
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg border shadow-sm transition-colors',
        active
          ? 'border-[#363687] bg-[#363687]/10 text-[#363687]'
          : 'border-[#e5e5e5] bg-white text-[#404040] hover:bg-neutral-50',
      )}
    >
      {icon}
    </button>
  );
}
