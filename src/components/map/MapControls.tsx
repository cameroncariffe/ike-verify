import { useState } from 'react';
import {
  ArrowLeftFromLine, ArrowRightFromLine,
  Eye, SquareDashedMousePointer, Hand, Eraser,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MapControlsProps {
  panelOpen: boolean;
  onTogglePanel: () => void;
}

type Tool = 'view' | 'select' | 'pan';

export function MapControls({ panelOpen, onTogglePanel }: MapControlsProps) {
  const [activeTool, setActiveTool] = useState<Tool>('view');

  return (
    <div className="absolute top-2 right-2 z-20 flex flex-col gap-2 items-center w-12">
      {/* Right-panel toggle */}
      <button
        onClick={onTogglePanel}
        title={panelOpen ? 'Close panel' : 'Open panel'}
        className="flex items-center justify-center w-12 h-12 rounded-lg border border-[#f7f9fc] bg-[#363687] text-white hover:bg-[#2f2f78] transition-colors shadow-sm"
      >
        {panelOpen ? <ArrowRightFromLine size={24} /> : <ArrowLeftFromLine size={24} />}
      </button>

      {/* Tool strip */}
      <div className="flex flex-col items-center gap-2 p-2 rounded-lg bg-white shadow-sm">
        <ToolButton
          icon={<Eye size={20} />}
          active={activeTool === 'view'}
          onClick={() => setActiveTool('view')}
          title="View"
        />
        <ToolButton
          icon={<SquareDashedMousePointer size={20} />}
          active={activeTool === 'select'}
          onClick={() => setActiveTool('select')}
          title="Select"
        />
        <ToolButton
          icon={<Hand size={20} />}
          active={activeTool === 'pan'}
          onClick={() => setActiveTool('pan')}
          title="Pan"
        />
        <div className="w-6 h-px bg-[#2a2f3c]/40" />
        <ToolButton icon={<Eraser size={20} />} disabled title="Erase" />
      </div>
    </div>
  );
}

function ToolButton({
  icon, active = false, disabled = false, onClick, title,
}: {
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg border shadow-sm transition-colors',
        disabled
          ? 'border-[#e5e5e5] bg-white text-[#404040] opacity-50 cursor-not-allowed'
          : active
            ? 'border-[#363687] bg-[#363687]/10 text-[#363687]'
            : 'border-[#e5e5e5] bg-white text-[#404040] hover:bg-neutral-50'
      )}
    >
      {icon}
    </button>
  );
}
