import { useState, useCallback } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { LeftSidebar } from '../components/layout/LeftSidebar';
import { MapView } from '../components/map/MapView';
import { PoleDetailsPanel } from '../components/panels/PoleDetailsPanel';
import type { Job, DesignSet } from '../types';
import { mockRuleSets } from '../data/mockData';

interface ValidationWorkbenchProps {
  job: Job;
  onJobUpdate: (job: Job) => void;
}

export function ValidationWorkbench({ job, onJobUpdate }: ValidationWorkbenchProps) {
  const [selectedPoleId, setSelectedPoleId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const activeDesignSet = job.designSets.find(d => d.id === job.activeDesignSetId)!;
  const poles = activeDesignSet.poles;

  const selectedPole = poles.find(p => p.id === selectedPoleId) ?? null;
  const selectedPoleIndex = poles.findIndex(p => p.id === selectedPoleId);

  const handleSelectPole = useCallback((id: string) => {
    setSelectedPoleId(id);
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

  const handleDuplicateDesignSet = useCallback((sourceId: string) => {
    const source = job.designSets.find(d => d.id === sourceId);
    if (!source) return;
    const copyCount = job.designSets.filter(d => d.parentId === sourceId).length;
    const newSet: DesignSet = {
      id: `ds-copy-${Date.now()}`,
      name: `${source.name} (Copy ${copyCount + 1})`,
      label: `Copy ${copyCount + 1}`,
      parentId: sourceId,
      isDuplicate: true,
      createdAt: new Date().toISOString(),
      poles: source.poles.map(p => ({
        ...p,
        id: `${p.id}-copy-${Date.now()}`,
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
  }, [job, onJobUpdate]);

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
          onDuplicateDesignSet={handleDuplicateDesignSet}
          onRunValidation={handleRunValidation}
          ruleSets={mockRuleSets}
          lastRun={lastRun}
        />

        <main className="flex flex-1 min-w-0 overflow-hidden relative">
          <MapView
            poles={poles}
            selectedPoleId={selectedPoleId}
            onSelectPole={handleSelectPole}
          />

          {/* Map toolbar (vertical icon strip) */}
          <div className="absolute top-2 right-[530px] flex flex-col gap-1.5 bg-white rounded-lg border border-neutral-200 p-1.5 shadow-sm z-10">
            {['👁', '✏️', '✋', '◇'].map((icon, i) => (
              <button
                key={i}
                className="w-8 h-8 flex items-center justify-center rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-sm shadow-sm transition-colors"
              >
                {icon}
              </button>
            ))}
          </div>
        </main>

        <PoleDetailsPanel
          pole={selectedPole}
          showResults={showResults}
          onToggleResults={() => setShowResults(o => !o)}
          onPrev={handlePrev}
          onNext={handleNext}
          canPrev={selectedPoleIndex > 0}
          canNext={selectedPoleIndex < poles.length - 1}
          onClose={() => setSelectedPoleId(null)}
        />
      </div>
    </div>
  );
}
