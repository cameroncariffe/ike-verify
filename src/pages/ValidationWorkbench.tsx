import { useState, useCallback } from 'react';
import { Navbar } from '../components/layout/Navbar';
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

/** Find a pole or one of its nested variants by id. */
function findPoleDeep(list: Pole[], id: string | null): Pole | null {
  if (!id) return null;
  for (const p of list) {
    if (p.id === id) return p;
    const v = p.variants?.find(x => x.id === id);
    if (v) return v;
  }
  return null;
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
  const [panelWidth, setPanelWidth] = useState(PANEL_DEFAULT_WIDTH);
  const [imagesExpanded, setImagesExpanded] = useState(false);
  // The version the user is *looking at*. Distinct from the active version,
  // which only changes via "Set as active".
  const [viewedDesignSetId, setViewedDesignSetId] = useState(job.activeDesignSetId);

  const viewedDesignSet = job.designSets.find(d => d.id === viewedDesignSetId)
    ?? job.designSets.find(d => d.id === job.activeDesignSetId)
    ?? job.designSets[0];
  const poles = viewedDesignSet.poles;

  const isActiveView = viewedDesignSet.id === job.activeDesignSetId;
  // Base (imported) poles are only editable in the active, non-imported version.
  const baseEditable = isActiveView && !viewedDesignSet.readOnly;
  // Per-pole variants can be created/edited whenever viewing the active version
  // — including from the read-only Original, which is the user's starting point.
  const canCreateVariant = isActiveView;

  const selectedPole = findPoleDeep(poles, selectedPoleId);
  const selectedIsVariant = !!selectedPole?.variantOf;
  const readOnly = selectedIsVariant ? !isActiveView : !baseEditable;
  const readOnlyReason: 'original' | 'inactive' | null =
    readOnly ? (!isActiveView ? 'inactive' : 'original') : null;

  // Prev/next for the image strip are based on the base pole's position.
  const baseId = selectedPole?.variantOf ?? selectedPole?.id ?? null;
  const baseIndex = baseId ? poles.findIndex(p => p.id === baseId) : -1;
  const prevPole = baseIndex > 0 ? poles[baseIndex - 1] : null;
  const nextPole = baseIndex >= 0 && baseIndex < poles.length - 1 ? poles[baseIndex + 1] : null;

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

  // Create pole-level variants nested under the selected pole(s). These do NOT
  // appear in the top version tree — only as children of their base pole.
  const handleCreateVariants = useCallback((poleIds: string[], meta?: VersionMeta) => {
    if (poleIds.length === 0 || !canCreateVariant) return;
    let firstNewId: string | null = null;

    const addVariant = (p: Pole): Pole => {
      if (!poleIds.includes(p.id)) return p;
      const n = (p.variants?.length ?? 0) + 1;
      const newId = `${p.id}-v${n}-${Date.now()}`;
      if (!firstNewId) firstNewId = newId;
      const clone = structuredClone(p);
      const variant: Pole = {
        ...clone,
        id: newId,
        variantOf: p.id,
        variantLabel: meta?.name?.trim() || `Version ${n}`,
        createdAt: new Date().toISOString(),
        variants: undefined,
        // Adopt the parent pole's current rule outcome.
        validationResults: clone.validationResults ?? [],
        fieldIssues: clone.fieldIssues ?? {},
      };
      return { ...p, variants: [...(p.variants ?? []), variant] };
    };

    onJobUpdate({
      ...job,
      designSets: job.designSets.map(d =>
        d.id === viewedDesignSet.id ? { ...d, poles: d.poles.map(addVariant) } : d
      ),
    });
    if (firstNewId) {
      setSelectedPoleId(firstNewId);
      setPanelOpen(true);
    }
  }, [job, onJobUpdate, viewedDesignSet.id, canCreateVariant]);

  // Promote a pole variant to be the base pole (its "active" version). Its design
  // replaces the base; remaining variants stay as alternatives. Requires an
  // editable set, since it overwrites the base pole.
  const handlePromoteVariant = useCallback((variantId: string) => {
    if (!baseEditable) return;
    const base = viewedDesignSet.poles.find(p => p.variants?.some(v => v.id === variantId));
    onJobUpdate({
      ...job,
      designSets: job.designSets.map(d => {
        if (d.id !== viewedDesignSet.id) return d;
        return {
          ...d,
          poles: d.poles.map(p => {
            const variant = p.variants?.find(v => v.id === variantId);
            if (!variant) return p;
            const others = p.variants!.filter(v => v.id !== variantId);
            // The version being replaced is preserved as a child of the new
            // active pole. Keep it labeled "Original" (deduped) so its history
            // (and prior rule outcome) isn't lost.
            const siblingLabels = new Set(others.map(v => v.variantLabel));
            let demotedLabel = 'Original';
            if (siblingLabels.has(demotedLabel)) {
              let i = 2;
              while (siblingLabels.has(`Original (${i})`)) i++;
              demotedLabel = `Original (${i})`;
            }
            const demoted: Pole = {
              ...p,
              id: `${p.id}-prev-${Date.now()}`,
              variantOf: p.id,
              variantLabel: demotedLabel,
              createdAt: p.createdAt ?? new Date().toISOString(),
              variants: undefined,
            };
            return {
              ...variant,
              id: p.id,
              poleNumber: p.poleNumber,
              taggedDate: p.taggedDate,
              variantOf: undefined,
              variantLabel: undefined,
              createdAt: undefined,
              variants: [...others, demoted],
            };
          }),
        };
      }),
    });
    if (base) setSelectedPoleId(base.id);
  }, [job, onJobUpdate, viewedDesignSet.id, viewedDesignSet.poles, baseEditable]);

  const handleRenameVariant = useCallback((variantId: string, name: string) => {
    onJobUpdate({
      ...job,
      designSets: job.designSets.map(d => {
        if (d.id !== viewedDesignSet.id) return d;
        return {
          ...d,
          poles: d.poles.map(p =>
            p.variants?.some(v => v.id === variantId)
              ? { ...p, variants: p.variants.map(v => v.id === variantId ? { ...v, variantLabel: name } : v) }
              : p
          ),
        };
      }),
    });
  }, [job, onJobUpdate, viewedDesignSet.id]);

  const handleDeleteVariant = useCallback((variantId: string) => {
    onJobUpdate({
      ...job,
      designSets: job.designSets.map(d => {
        if (d.id !== viewedDesignSet.id) return d;
        return {
          ...d,
          poles: d.poles.map(p =>
            p.variants?.some(v => v.id === variantId)
              ? { ...p, variants: p.variants.filter(v => v.id !== variantId) }
              : p
          ),
        };
      }),
    });
    if (selectedPoleId === variantId) {
      setSelectedPoleId(null);
      setPanelOpen(false);
    }
  }, [job, onJobUpdate, viewedDesignSet.id, selectedPoleId]);

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
    const target = findPoleDeep(viewedDesignSet.poles, poleId);
    if (!target) return;
    // Variants are editable in the active version; base poles need an editable set.
    const targetEditable = target.variantOf ? isActiveView : baseEditable;
    if (!targetEditable) return;

    const editPole = (p: Pole): Pole => ({ ...p, ...patch, validationResults: [], fieldIssues: {} });

    onJobUpdate({
      ...job,
      designSets: job.designSets.map(d => {
        if (d.id !== viewedDesignSet.id) return d;
        return {
          ...d,
          poles: d.poles.map(p => {
            if (p.id === poleId) return editPole(p);
            if (p.variants?.some(v => v.id === poleId)) {
              return { ...p, variants: p.variants.map(v => v.id === poleId ? editPole(v) : v) };
            }
            return p;
          }),
        };
      }),
    });
  }, [job, onJobUpdate, viewedDesignSet.id, viewedDesignSet.poles, isActiveView, baseEditable]);

  // ── Rule checks (run against the version being viewed) ──────────────────────
  const handleRunValidation = useCallback((ruleSetId: string) => {
    const ruleSet = mockRuleSets.find(r => r.id === ruleSetId);
    if (!ruleSet) return;
    const { poles: ranPoles, run } = runRulesOnPoles(viewedDesignSet.poles, ruleSet);
    onJobUpdate({
      ...job,
      designSets: job.designSets.map(d =>
        d.id === viewedDesignSet.id
          ? { ...d, poles: ranPoles, runHistory: [run, ...d.runHistory] }
          : d
      ),
    });
  }, [job, onJobUpdate, viewedDesignSet.id, viewedDesignSet.poles]);

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
            designSets={job.designSets}
            activeDesignSetId={job.activeDesignSetId}
            viewedDesignSetId={viewedDesignSet.id}
            canCreateVariant={canCreateVariant}
            baseReadOnly={!baseEditable}
            onSelectVersion={handleViewVersion}
            onSetActiveVersion={handleSetActiveVersion}
            onCreateVersion={handleCreateVersion}
            onCreateVariants={handleCreateVariants}
            onPromoteVariant={handlePromoteVariant}
            onRenameVariant={handleRenameVariant}
            onDeleteVariant={handleDeleteVariant}
            canPromoteVariant={baseEditable}
            onRenameVersion={handleRenameVersion}
            onDeleteVersion={handleDeleteVersion}
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
            canCreateVariant={canCreateVariant}
            onUpdatePole={handleUpdatePole}
            onCreateVersionFromPole={poleId => handleCreateVariants([poleId])}
            onSetActive={() => handleSetActiveVersion(viewedDesignSet.id)}
          />
        )}
      </div>
    </div>
  );
}
