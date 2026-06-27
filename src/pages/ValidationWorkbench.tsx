import { useState, useCallback, useRef, useEffect } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { RuleRunDialog, ResultToast, type ResultToastData } from '../components/layout/RuleRunFeedback';
import { PublishFlow, PublishToast, type PublishStage } from '../components/layout/PublishFlow';
import { LeftSidebar } from '../components/layout/LeftSidebar';
import { MapView } from '../components/map/MapView';
import { MapControls } from '../components/map/MapControls';
import { PoleImages } from '../components/map/PoleImages';
import { PoleDetailsPanel } from '../components/panels/PoleDetailsPanel';
import type { Job, DesignSet, Pole } from '../types';
import { mockRuleSets, runRulesOnPoles } from '../data/mockData';

const PANEL_DEFAULT_WIDTH = 520;
const PANEL_MIN_WIDTH = 360;
const PANEL_MAX_WIDTH = 1000;

function findPole(list: Pole[], id: string | null): Pole | null {
  if (!id) return null;
  return list.find(p => p.id === id) ?? null;
}

export interface VersionMeta {
  name: string;
  description?: string;
  variantType?: string;
}

interface ValidationWorkbenchProps {
  job: Job;
  onJobUpdate: (job: Job) => void;
  onResetPrototype: () => void;
}

export function ValidationWorkbench({ job, onJobUpdate, onResetPrototype }: ValidationWorkbenchProps) {
  const [selectedPoleId, setSelectedPoleId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  // Bumped whenever "Edit properties" is chosen, to drop the panel into edit mode.
  const [editSignal, setEditSignal] = useState(0);
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const [imagesExpanded, setImagesExpanded] = useState(false);
  // Mock rule-run processing flow: a 3s dialog, then a result toaster.
  const [runningRule, setRunningRule] = useState<{ id: string; name: string } | null>(null);
  const [resultToast, setResultToast] = useState<ResultToastData | null>(null);
  const runTimerRef = useRef<number | null>(null);
  // Publish flow: confirm → optional warning → 3s progress → success toaster.
  const [publishTarget, setPublishTarget] = useState<DesignSet | null>(null);
  const [publishStage, setPublishStage] = useState<PublishStage>(null);
  const [publishedToast, setPublishedToast] = useState<string | null>(null);
  const publishTimerRef = useRef<number | null>(null);
  // The version the user is *looking at*. Distinct from the active version,
  // which only changes via "Set as active".
  const [viewedDesignSetId, setViewedDesignSetId] = useState(job.activeDesignSetId);

  const viewedDesignSet = job.designSets.find(d => d.id === viewedDesignSetId)
    ?? job.designSets.find(d => d.id === job.activeDesignSetId)
    ?? job.designSets[0];
  const poles = viewedDesignSet.poles;

  const isActiveView = viewedDesignSet.id === job.activeDesignSetId;
  // Poles are only editable in the active, non-imported version.
  const baseEditable = isActiveView && !viewedDesignSet.readOnly;

  const selectedPole = findPole(poles, selectedPoleId);
  const readOnly = !baseEditable;
  const readOnlyReason: 'original' | 'inactive' | null =
    readOnly ? (!isActiveView ? 'inactive' : 'original') : null;

  const baseIndex = selectedPole ? poles.findIndex(p => p.id === selectedPole.id) : -1;
  const prevPole = baseIndex > 0 ? poles[baseIndex - 1] : null;
  const nextPole = baseIndex >= 0 && baseIndex < poles.length - 1 ? poles[baseIndex + 1] : null;

  const handleSelectPole = useCallback((id: string) => {
    setSelectedPoleId(id);
    setPanelOpen(true);
  }, []);

  // "Edit properties": reveal the pole in the panel and drop it into edit mode.
  const handleEditPoleProperties = useCallback((id: string) => {
    setSelectedPoleId(id);
    setPanelOpen(true);
    setEditSignal(n => n + 1);
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

  // ── Version management ──────────────────────────────────────────────────────
  // Clicking a version row just views it (read-only unless it's the active one).
  const handleViewVersion = useCallback((id: string) => {
    setViewedDesignSetId(id);
    setSelectedPoleId(null);
    setPanelOpen(false);
    setImagesExpanded(false);
  }, []);

  // Explicit activation (kebab → Set as active). Also switches the view to it.
  const handleSetActiveVersion = useCallback((id: string) => {
    onJobUpdate({ ...job, activeDesignSetId: id });
    setViewedDesignSetId(id);
    setSelectedPoleId(null);
    setPanelOpen(false);
    setImagesExpanded(false);
  }, [job, onJobUpdate]);

  const versionCount = job.designSets.filter(d => !d.isOriginal).length;

  const handleCreateVersion = useCallback((meta: VersionMeta) => {
    const source = job.designSets.find(d => d.id === viewedDesignSetId) ?? job.designSets[0];
    const newId = `ds-${Date.now()}`;
    const newSet: DesignSet = {
      id: newId,
      name: meta.name || `Version ${versionCount + 1}`,
      label: meta.name || `Version ${versionCount + 1}`,
      parentId: source.id,
      isDuplicate: true,
      isOriginal: false,
      readOnly: false,
      description: meta.description,
      variantType: meta.variantType,
      scope: 'full',
      createdAt: new Date().toISOString(),
      // Inherit the parent's poles AND its rule outcome (results + run history).
      poles: structuredClone(source.poles),
      runHistory: structuredClone(source.runHistory),
    };
    onJobUpdate({
      ...job,
      activeDesignSetId: newId,
      designSets: [...job.designSets, newSet],
    });
    setViewedDesignSetId(newId);
    setSelectedPoleId(null);
    setPanelOpen(false);
  }, [job, onJobUpdate, versionCount, viewedDesignSetId]);

  // Apply the same field changes to many poles at once (Bulk edit). Only the
  // editable, active version can be changed. Clears prior rule results so the
  // edited poles must be re-run.
  const handleBulkEdit = useCallback((poleIds: string[], patch: Partial<Pole>) => {
    if (poleIds.length === 0 || !baseEditable) return;
    const ids = new Set(poleIds);
    onJobUpdate({
      ...job,
      designSets: job.designSets.map(d => {
        if (d.id !== viewedDesignSet.id) return d;
        return {
          ...d,
          poles: d.poles.map(p =>
            ids.has(p.id)
              ? { ...p, ...patch, validationResults: [], fieldIssues: {} }
              : p
          ),
        };
      }),
    });
  }, [job, onJobUpdate, viewedDesignSet.id, baseEditable]);

  const handleRenameVersion = useCallback((id: string, name: string) => {
    onJobUpdate({
      ...job,
      designSets: job.designSets.map(d => d.id === id ? { ...d, name, label: name } : d),
    });
  }, [job, onJobUpdate]);

  const handleDeleteVersion = useCallback((id: string) => {
    const target = job.designSets.find(d => d.id === id);
    if (!target || target.isOriginal) return;
    // Reparent any children to the deleted node's parent.
    const remaining = job.designSets
      .filter(d => d.id !== id)
      .map(d => d.parentId === id ? { ...d, parentId: target.parentId } : d);
    const fallbackId = target.parentId ?? remaining[0]?.id ?? '';
    const nextActive = job.activeDesignSetId === id ? fallbackId : job.activeDesignSetId;
    onJobUpdate({ ...job, designSets: remaining, activeDesignSetId: nextActive });
    if (viewedDesignSetId === id) {
      setViewedDesignSetId(fallbackId);
      setSelectedPoleId(null);
      setPanelOpen(false);
    }
  }, [job, onJobUpdate, viewedDesignSetId]);

  // ── Editing (persists to the viewed version; only when editable) ────────────
  const handleUpdatePole = useCallback((poleId: string, patch: Partial<Pole>) => {
    if (!baseEditable) return;
    onJobUpdate({
      ...job,
      designSets: job.designSets.map(d => {
        if (d.id !== viewedDesignSet.id) return d;
        return {
          ...d,
          poles: d.poles.map(p =>
            p.id === poleId
              ? { ...p, ...patch, validationResults: [], fieldIssues: {} }
              : p
          ),
        };
      }),
    });
  }, [job, onJobUpdate, viewedDesignSet.id, baseEditable]);

  // Renaming only changes the pole's label — it doesn't invalidate rule results.
  const handleRenamePole = useCallback((poleId: string, name: string) => {
    if (!baseEditable) return;
    onJobUpdate({
      ...job,
      designSets: job.designSets.map(d => {
        if (d.id !== viewedDesignSet.id) return d;
        return {
          ...d,
          poles: d.poles.map(p => (p.id === poleId ? { ...p, poleNumber: name } : p)),
        };
      }),
    });
  }, [job, onJobUpdate, viewedDesignSet.id, baseEditable]);

  // ── Rule checks (run against the version being viewed) ──────────────────────
  // Kick off the mock 3s processing flow; the actual run happens when it finishes.
  const handleRunValidation = useCallback((ruleSetId: string) => {
    const ruleSet = mockRuleSets.find(r => r.id === ruleSetId);
    if (!ruleSet) return;
    if (runTimerRef.current) window.clearTimeout(runTimerRef.current);
    setResultToast(null);
    setRunningRule({ id: ruleSet.id, name: ruleSet.name });

    runTimerRef.current = window.setTimeout(() => {
      const { poles: ranPoles, run } = runRulesOnPoles(viewedDesignSet.poles, ruleSet);
      onJobUpdate({
        ...job,
        designSets: job.designSets.map(d =>
          d.id === viewedDesignSet.id
            ? { ...d, poles: ranPoles, runHistory: [run, ...d.runHistory] }
            : d
        ),
      });
      const s = run.summary;
      const status: ResultToastData['status'] =
        s.fail > 0 ? 'fail' : (s.warning > 0 || s.review > 0) ? 'warning' : 'pass';
      setResultToast({ ruleSetName: ruleSet.name, summary: s, status });
      setRunningRule(null);
      runTimerRef.current = null;
    }, 3000);
  }, [job, onJobUpdate, viewedDesignSet.id, viewedDesignSet.poles]);

  const handleStopRun = useCallback(() => {
    if (runTimerRef.current) window.clearTimeout(runTimerRef.current);
    runTimerRef.current = null;
    setRunningRule(null);
  }, []);

  // ── Publish flow ────────────────────────────────────────────────────────────
  const publishFailCount = publishTarget?.runHistory[0]?.summary.fail ?? 0;

  const handlePublishVersion = useCallback((id: string) => {
    const set = job.designSets.find(d => d.id === id);
    if (!set) return;
    setPublishTarget(set);
    setPublishStage('confirm');
  }, [job.designSets]);

  const cancelPublish = useCallback(() => {
    if (publishTimerRef.current) window.clearTimeout(publishTimerRef.current);
    publishTimerRef.current = null;
    setPublishStage(null);
    setPublishTarget(null);
  }, []);

  const startPublishProgress = useCallback(() => {
    const target = publishTarget;
    if (!target) return;
    setPublishStage('progress');
    publishTimerRef.current = window.setTimeout(() => {
      onJobUpdate({
        ...job,
        designSets: job.designSets.map(d =>
          d.id === target.id ? { ...d, published: true } : d
        ),
      });
      setPublishStage(null);
      setPublishTarget(null);
      setPublishedToast(target.name);
      publishTimerRef.current = null;
    }, 3000);
  }, [publishTarget, job, onJobUpdate]);

  // Primary action in the publish dialog: confirm → warn (if failures) → progress.
  const confirmPublish = useCallback(() => {
    if (publishStage === 'confirm' && publishFailCount > 0) {
      setPublishStage('warn');
      return;
    }
    startPublishProgress();
  }, [publishStage, publishFailCount, startPublishProgress]);

  // Clear any pending timers on unmount.
  useEffect(() => () => {
    if (runTimerRef.current) window.clearTimeout(runTimerRef.current);
    if (publishTimerRef.current) window.clearTimeout(publishTimerRef.current);
  }, []);

  const lastRun = viewedDesignSet.runHistory[0];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#f7f9fc]">
      <Navbar account={`ikeGPS > ${job.account}`} onResetPrototype={onResetPrototype} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!imagesExpanded && (
          <LeftSidebar
            poles={poles}
            selectedPoleId={selectedPoleId}
            onSelectPole={handleSelectPole}
            onEditPoleProperties={handleEditPoleProperties}
            onRenamePole={handleRenamePole}
            designSets={job.designSets}
            activeDesignSetId={job.activeDesignSetId}
            viewedDesignSetId={viewedDesignSet.id}
            baseReadOnly={!baseEditable}
            onSelectVersion={handleViewVersion}
            onSetActiveVersion={handleSetActiveVersion}
            onCreateVersion={handleCreateVersion}
            onBulkEdit={handleBulkEdit}
            onRenameVersion={handleRenameVersion}
            onDeleteVersion={handleDeleteVersion}
            onPublishVersion={handlePublishVersion}
            onRunValidation={handleRunValidation}
            ruleSets={mockRuleSets}
            lastRun={lastRun}
            runHistory={viewedDesignSet.runHistory}
            jobName={job.name}
          />
        )}

        <main className="flex flex-1 min-w-0 overflow-hidden relative">
          <MapView />
          {!imagesExpanded && (
            <MapControls panelOpen={panelOpen} onTogglePanel={handleTogglePanel} />
          )}
          {selectedPole && (
            <PoleImages
              pole={selectedPole}
              prevPole={prevPole}
              nextPole={nextPole}
              expanded={imagesExpanded}
              onToggleExpanded={() => setImagesExpanded(o => !o)}
              onSelectPole={handleSelectPole}
            />
          )}
        </main>

        {panelOpen && (
          <PoleDetailsPanel
            pole={selectedPole}
            width={panelWidth}
            onResizeStart={handleResizeStart}
            readOnly={readOnly}
            readOnlyReason={readOnlyReason}
            editSignal={editSignal}
            onUpdatePole={handleUpdatePole}
            onSetActive={() => handleSetActiveVersion(viewedDesignSet.id)}
          />
        )}
      </div>

      <RuleRunDialog
        open={!!runningRule}
        ruleSetName={runningRule?.name ?? ''}
        poleCount={viewedDesignSet.poles.length}
        onStop={handleStopRun}
      />
      <ResultToast toast={resultToast} onClose={() => setResultToast(null)} />

      <PublishFlow
        stage={publishStage}
        versionName={publishTarget?.name ?? ''}
        failCount={publishFailCount}
        onCancel={cancelPublish}
        onConfirm={confirmPublish}
      />
      <PublishToast versionName={publishedToast} onClose={() => setPublishedToast(null)} />
    </div>
  );
}
