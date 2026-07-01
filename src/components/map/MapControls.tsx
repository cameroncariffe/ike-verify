import { useState, useEffect } from 'react';
import {
  ArrowLeftFromLine, ArrowRightFromLine,
  Eye, Hand, Eraser, Plus,
  MousePointerClick, Lasso, SquareDashedMousePointer, Route as RouteIcon,
} from 'lucide-react';
import type { MapRoute } from '../../types';
import { cn } from '../../lib/utils';

export type MapTool = 'view' | 'select' | 'pan';
export type SelectTool = 'click' | 'lasso' | 'box';

interface MapControlsProps {
  panelOpen: boolean;
  onTogglePanel: () => void;
  activeTool: MapTool;
  onToolChange: (tool: MapTool) => void;
  selectTool: SelectTool;
  onSelectToolChange: (tool: SelectTool) => void;
  /** Whether any poles are currently selected on the map (enables Erase). */
  hasSelection: boolean;
  /** Clears all map selections. */
  onClearSelection: () => void;
  /** Enables the Route button (routes exist, or more than one pole selected). */
  canRoute: boolean;
  /** Enables the "Add route" action (needs more than one pole selected). */
  canAddRoute: boolean;
  /** Existing routes for this job, shown in the Route flyout. */
  routes: MapRoute[];
  /** Opens the "Set route" modal for the current selection. */
  onAddRoute: () => void;
  /** Selects an existing route's poles on the map. */
  onSelectRoute: (route: MapRoute) => void;
}

const SELECT_ORDER: SelectTool[] = ['click', 'lasso', 'box'];
const SELECT_ICON: Record<SelectTool, typeof MousePointerClick> = {
  click: MousePointerClick,
  lasso: Lasso,
  box: SquareDashedMousePointer,
};
const SELECT_LABEL: Record<SelectTool, string> = {
  click: 'Click select',
  lasso: 'Lasso select',
  box: 'Box select',
};

export function MapControls({
  panelOpen, onTogglePanel, activeTool, onToolChange, selectTool, onSelectToolChange,
  hasSelection, onClearSelection, canRoute, canAddRoute, routes, onAddRoute, onSelectRoute,
}: MapControlsProps) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [routeFlyoutOpen, setRouteFlyoutOpen] = useState(false);

  const selectActive = activeTool === 'select';
  const SelectIcon = SELECT_ICON[selectTool];

  // Close the route flyout if the selection drops below the routing threshold.
  useEffect(() => {
    if (!canRoute) setRouteFlyoutOpen(false);
  }, [canRoute]);

  const pickTool = (tool: MapTool) => {
    onToolChange(tool);
    if (tool !== 'select') setFlyoutOpen(false);
  };

  // Clicking the select button activates it and opens the flyout; clicking it
  // again while active toggles the flyout closed.
  const handleSelectClick = () => {
    if (selectActive) {
      setFlyoutOpen(o => !o);
    } else {
      onToolChange('select');
      setFlyoutOpen(true);
    }
  };

  // Choosing an alternative tool swaps it into the toolbar and closes the flyout.
  const chooseSelectTool = (tool: SelectTool) => {
    onSelectToolChange(tool);
    setFlyoutOpen(false);
    onToolChange('select');
  };

  const alternatives = SELECT_ORDER.filter(t => t !== selectTool);

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
      <div className="relative flex flex-col items-center gap-2 p-2 rounded-lg bg-white shadow-sm">
        <ToolButton
          icon={<Eye size={20} />}
          active={activeTool === 'view'}
          onClick={() => pickTool('view')}
          title="View"
        />
        <ToolButton
          icon={<SelectIcon size={20} />}
          active={selectActive}
          onClick={handleSelectClick}
          title={SELECT_LABEL[selectTool]}
        />
        <ToolButton
          icon={<Hand size={20} />}
          active={activeTool === 'pan'}
          onClick={() => pickTool('pan')}
          title="Pan"
        />
        <div className="w-6 h-px bg-[#2a2f3c]/40" />
        <ToolButton
          icon={<Eraser size={20} />}
          disabled={!hasSelection}
          onClick={onClearSelection}
          title="Clear selection"
        />
        <ToolButton
          icon={<RouteIcon size={20} />}
          disabled={!canRoute}
          active={routeFlyoutOpen}
          onClick={() => setRouteFlyoutOpen(o => !o)}
          title="Route"
        />

        {/* Route flyout — Add a route + existing routes for this job */}
        {routeFlyoutOpen && canRoute && (
          <div className="absolute right-full bottom-0 mr-2 w-52 flex flex-col rounded-lg bg-white border border-[#e5e5e5] shadow-md overflow-hidden">
            <div className="px-3 pt-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#9ea2aa]">
              Routes
            </div>
            <button
              onClick={() => { setRouteFlyoutOpen(false); onAddRoute(); }}
              disabled={!canAddRoute}
              title={canAddRoute ? undefined : 'Select 2 or more poles to add a route'}
              className={cn(
                'flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors',
                canAddRoute
                  ? 'text-[#363687] hover:bg-[#363687]/5'
                  : 'text-[#c9cdd2] cursor-not-allowed'
              )}
            >
              <Plus size={16} /> Add route
            </button>
            {routes.length > 0 && (
              <>
                <div className="h-px bg-[#f0f0f0]" />
                <div className="max-h-56 overflow-y-auto py-1">
                  {routes.map(route => (
                    <button
                      key={route.id}
                      onClick={() => { setRouteFlyoutOpen(false); onSelectRoute(route); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50 transition-colors"
                    >
                      <RouteIcon size={14} className="text-[#737373] shrink-0" />
                      <span className="flex-1 min-w-0 text-sm text-[#3c404d] truncate">{route.name}</span>
                      <span className="text-[11px] text-[#9ea2aa] shrink-0">{route.poleIds.length}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Select-tools flyout — shows the alternative select tools, overlapping
            the toolbar's left edge by 4px (per Figma). */}
        {selectActive && flyoutOpen && (
          <div className="absolute right-full top-[40px] -mr-1 z-10 flex items-center gap-2 p-2 rounded-lg bg-white border border-[#e5e5e5] shadow-sm">
            {alternatives.map(tool => {
              const Icon = SELECT_ICON[tool];
              return (
                <ToolButton
                  key={tool}
                  icon={<Icon size={20} />}
                  onClick={() => chooseSelectTool(tool)}
                  title={SELECT_LABEL[tool]}
                />
              );
            })}
          </div>
        )}
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
