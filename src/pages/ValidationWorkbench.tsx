import { useState, useCallback } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { LeftSidebar } from '../components/layout/LeftSidebar';
import { MapView } from '../components/map/MapView';
import { MapControls } from '../components/map/MapControls';
import { PoleDetailsPanel } from '../components/panels/PoleDetailsPanel';
import type { Job, DesignSet } from '../types';
import { mockRuleSets } from '../data/mockData';

const PANEL_DEFAULT_WIDTH = 520;
const PANEL_MIN_WIDTH = 360;
const PANEL_MAX_WIDTH = 1000;

interface ValidationWorkbenchProps {
  job: Job;
  onJobUpdate: (job: Job) => void;
}

export function ValidationWorkbench({ job, onJobUpdate }: ValidationWorkbenchProps) {
  const [selectedPoleId, setSelectedPoleId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);

  const activeDesignSet = job.designSets.find(d => d.id === job.activeDesignSetId)!;
  const poles = activeDesignSet.poles;

  const selectedPole = poles.find(p => p.id === selectedPoleId) ?? null;
  const selectedPoleIndex = poles.findIndex(p => p.id === selectedPoleId);

  const handleSelectPole = useCallback((id: string) => {
    setSelectedPoleId(id);
    setPanelOpen(true);
  }, []);

  const handleTogglePanel = useCallback(() => {
    setPanelOpen(o => !o);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      const next = window.innerWidth - ev.clientX;
      setPanelWidth(Math.min(Math.max(next, PANEL_MIN_WIDTH), PANEL_MAX_WIDTH));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'ew-resize';
  }, []);

  const handlePrev = useCallback(() => {
    if (selectedPoleIndex > 0) {
      setSelectedPoleId(poles[selectedPoleIndex - 1].id);
    }
  }, [selectedPoleIndex, poles]);

  const handleNext = useCallback(() => {
    if (selectedPoleIndex < poles.length - 1) {
      setSelectedPoleId(poles[selectedPoleIndex + 1].id);
    }
  }, [selectedPoleIndex, poles]);

  const handleSelectDesignSet = useCallback((id: string) => {
    onJobUpdate({ ...job, activeDesignSetId: id });
    setSelectedPoleId(null);
  }, [job, onJobUpdate]);

  const handleCreateDesignSet = useCallback((name: string) => {
    const source = activeDesignSet;
    const newSet: DesignSet = {
      id: `ds-${Date.now()}`,
      name,
      label: name,
      parentId: source.id,
      isDuplicate: false,
      createdAt: new Date().toISOString(),
      poles: source.poles.map(p => ({
        ...p,
        id: `${p.id}-${Date.now()}`,
        validationResults: [],
      })),
      runHistory: [],
    };
    const updated: Job = {
      ...job,
      activeDesignSetId: newSet.id,
      designSets: [...job.designSets, newSet],
    };
    onJobUpdate(updated);
    setSelectedPoleId(null);
  }, [job, activeDesignSet, onJobUpdate]);

  const handleRunValidation = useCallback((ruleSetId: string) => {
    const ruleSet = mockRuleSets.find(r => r.id === ruleSetId);
    if (!ruleSet) return;

    const updatedPoles = activeDesignSet.poles.map(pole => {
      const results = pole.validationResults ?? [];
      return { ...pole, validationResults: results };
    });

    const pass = updatedPoles.filter(p => (p.validationResults ?? []).every(r => r.status === 'pass' || r.status === 'review')).length;
    const fail = updatedPoles.filter(p => (p.validationResults ?? []).some(r => r.status === 'fail')).length;
    const warning = updatedPoles.filter(p =>
      !(p.validationResults ?? []).some(r => r.status === 'fail') &&
      (p.validationResults ?? []).some(r => r.status === 'warning')
    ).length;
    const review = updatedPoles.filter(p => (p.validationResults ?? []).some(r => r.status === 'review')).length;

    const newRun = {
      id: `run-${Date.now()}`,
      ruleSetId,
      ruleSetName: ruleSet.name,
      runAt: new Date().toISOString(),
      summary: { total: updatedPoles.length, pass, fail, warning, review }
    };

    const updatedSet: DesignSet = {
      ...activeDesignSet,
      poles: updatedPoles,
      runHistory: [newRun, ...activeDesignSet.runHistory],
    };

    const updated: Job = {
      ...job,
      designSets: job.designSets.map(d => d.id === updatedSet.id ? updatedSet : d),
    };
    onJobUpdate(updated);
    setShowResults(true);
  }, [job, activeDesignSet, onJobUpdate]);

  const lastRun = activeDesignSet.runHistory[0];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f7f9fc]">
      <Navbar account={`ikeGPS > ${job.account}`} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <LeftSidebar
          poles={poles}
          selectedPoleId={selectedPoleId}
          onSelectPole={handleSelectPole}
          designSets={job.designSets}
          activeDesignSetId={job.activeDesignSetId}
          onSelectDesignSet={handleSelectDesignSet}
          onCreateDesignSet={handleCreateDesignSet}
          onRunValidation={handleRunValidation}
          ruleSets={mockRuleSets}
          lastRun={lastRun}
          jobName={job.name}
        />

        <main className="flex flex-1 min-w-0 overflow-hidden relative">
          <MapView />
          <MapControls panelOpen={panelOpen} onTogglePanel={handleTogglePanel} />
        </main>

        {panelOpen && (
          <PoleDetailsPanel
            pole={selectedPole}
            showResults={showResults}
            onToggleResults={() => setShowResults(o => !o)}
            onPrev={handlePrev}
            onNext={handleNext}
            canPrev={selectedPoleIndex > 0}
            canNext={selectedPoleIndex < poles.length - 1}
            onClose={() => setPanelOpen(false)}
            width={panelWidth}
            onResizeStart={handleResizeStart}
          />
        )}
      </div>
    </div>
  );
}
