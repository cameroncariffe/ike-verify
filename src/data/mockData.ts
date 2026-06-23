import type { Job, RuleSet, Pole, SpanDetail, DesignSet, ValidationRun, VersionStatus, PoleValidationResult, FieldIssue } from '../types';

// Six mid-span records with realistic make-ready clearance values (inches).
// Each span owns its wires (Span → Wire hierarchy). NESC and Evergy
// (power-company) mid-span clearances are tracked separately; a handful of
// values trip fail/warning flags used by the "Show results" view.
const defaultSpans: SpanDetail[] = [
  {
    id: 'span-1', label: 'Span #1 – Building', color: 'red',
    length: `76' 1" at 249.47°`, type: 'Building', environment: 'Residential',
    midSpanIkePhoto: 1,
    commToSecEvergy: '40"', commToNeutEvergy: '44"', commToCommEvergy: '8"',
    commToSecNesc: '30"', commToNeutNesc: '30"', commToCommNesc: '4"',
    wires: [
      { id: 'w1-1', label: 'Wire #1 — Service Drops > TRIPLEX #2 AWG > Slack', color: 'lime' },
    ],
    issues: { commToCommEvergy: 'fail' },
  },
  {
    id: 'span-2', label: 'Span #2 – Building', color: 'blue',
    length: `54' 8" at 312.20°`, type: 'Building', environment: 'Residential',
    midSpanIkePhoto: 1,
    commToSecEvergy: '46"', commToNeutEvergy: '49"', commToCommEvergy: '15"',
    commToSecNesc: '40"', commToNeutNesc: '40"', commToCommNesc: '12"',
    wires: [
      { id: 'w2-1', label: 'Wire #1 — Service Drops > TRIPLEX #2 AWG > Slack', color: 'lime' },
    ],
  },
  {
    id: 'span-3', label: 'Span #3 – Fore Span', color: 'orange',
    length: `145' 2" at 91.42°`, type: 'Fore Span', environment: 'Roadway crossing',
    midSpanIkePhoto: 1,
    commToSecEvergy: '43"', commToNeutEvergy: '47"', commToCommEvergy: '13"',
    commToSecNesc: '32"', commToNeutNesc: '34"', commToCommNesc: '12"',
    wires: [
      { id: 'w3-1', label: 'Wire #1 — Comm > Fiber 144ct > Tension', color: 'amber' },
      { id: 'w3-2', label: 'Wire #2 — Comm > Coax > Lashed', color: 'orange' },
    ],
    issues: { commToSecNesc: 'warning' },
  },
  {
    id: 'span-4', label: 'Span #4 – Fore Span', color: 'amber',
    length: `118' 9" at 90.05°`, type: 'Fore Span', environment: 'Pedestrian',
    midSpanIkePhoto: 1,
    commToSecEvergy: '48"', commToNeutEvergy: '52"', commToCommEvergy: '16"',
    commToSecNesc: '42"', commToNeutNesc: '44"', commToCommNesc: '13"',
    wires: [
      { id: 'w4-1', label: 'Wire #1 — Comm > Fiber 144ct > Tension', color: 'amber' },
    ],
  },
  {
    id: 'span-5', label: 'Span #5 – Fore Span', color: 'lime',
    length: `127' 4" at 89.71°`, type: 'Fore Span', environment: 'Pedestrian',
    midSpanIkePhoto: 2,
    commToSecEvergy: '45"', commToNeutEvergy: '50"', commToCommEvergy: '14"',
    commToSecNesc: '41"', commToNeutNesc: '43"', commToCommNesc: '12"',
    wires: [
      { id: 'w5-1', label: 'Wire #1 — Comm > Fiber 144ct > Tension', color: 'amber' },
    ],
  },
  {
    id: 'span-6', label: 'Span #6 – Back Span', color: 'emerald',
    length: `98' 0" at 269.88°`, type: 'Back Span', environment: 'Residential',
    midSpanIkePhoto: 1,
    commToSecEvergy: '47"', commToNeutEvergy: '51"', commToCommEvergy: '15"',
    commToSecNesc: '40"', commToNeutNesc: '42"', commToCommNesc: '12"',
    wires: [
      { id: 'w6-1', label: 'Wire #1 — Comm > Coax > Lashed', color: 'orange' },
    ],
  },
];

const basePoles: Pole[] = [
  {
    id: 'p-3971', poleNumber: '3971', opNumber: '019', externalId: '019-ST00579640',
    status: 'HOA Complete', type: 'Southern Pine > 4 > 40', owner: 'COMMUNICATION > 001-AT&T',
    tip: "36' 5\"", ikePhoto: 1, commToLce: '79"', commToComm: '19"',
    location: { lat: 37.6538, lng: -97.3265, altitude: "1221' 5\"" },
    taggedDate: '12/04/24 02:30PM',
    makeReady: [{ id: 1, description: 'Make Ready #1 — 1/4" EHS, 12ct (0.453") N/S 1/4" EHS, 144ct (0.673) E 1/4" EHS, 144ct (0.673)+(2)12ct (0.453") W' }],
    equipment: [
      { id: 'eq-1', type: 'Power > Primary', owner: 'Evergy', height: '35\' 0"' },
      { id: 'eq-2', type: 'Communication > Fiber', owner: 'AT&T', height: '23\' 6"' },
    ]
  },
  {
    id: 'p-3972', poleNumber: '3972', opNumber: '019', externalId: '019-ST00579641',
    status: 'HOA Complete', type: 'Southern Pine > 4 > 40', owner: 'COMMUNICATION > 001-AT&T',
    tip: "34' 2\"", ikePhoto: 2, commToLce: '81"', commToComm: '22"',
    location: { lat: 37.6532, lng: -97.3268, altitude: "1220' 3\"" },
    taggedDate: '03/22/24 07:15AM',
  },
  {
    id: 'p-3973', poleNumber: '3973', opNumber: '019', externalId: '019-ST00579652',
    status: 'HOA Complete', type: 'Southern Pine > 4 > 40', owner: 'COMMUNICATION > 001-AT&T',
    tip: "36' 5\"", ikePhoto: 1, commToLce: '79"', commToComm: '19"',
    location: { lat: 37.6534, lng: -97.3269, altitude: "1221' 5\"" },
    taggedDate: '08/18/23 10:45AM',
    makeReady: [{ id: 1, description: 'Make Ready #1 — 1/4" EHS, 12ct (0.453") N/S 1/4" EHS, 144ct (0.673) E 1/4" EHS, 144ct (0.673)+(2)12ct (0.453") W' }],
    equipment: [
      { id: 'eq-3', type: 'Power > Primary', owner: 'Evergy', height: '35\' 0"' },
      { id: 'eq-4', type: 'Communication > Fiber', owner: 'AT&T', height: '22\' 0"' },
      { id: 'eq-5', type: 'Communication > Copper', owner: 'Cox', height: '20\' 6"' },
    ]
  },
  {
    id: 'p-3975', poleNumber: '3975', opNumber: '019', externalId: '019-ST00579655',
    status: 'In Progress', type: 'Douglas Fir > 3 > 45', owner: 'ELECTRIC > 002-Evergy',
    tip: "38' 0\"", ikePhoto: 3, commToLce: '72"', commToComm: '8"',
    location: { lat: 37.6528, lng: -97.3272, altitude: "1219' 8\"" },
    taggedDate: '09/10/24 03:00PM',
  },
  {
    id: 'p-3976', poleNumber: '3976', opNumber: '019', externalId: '019-ST00579656',
    status: 'HOA Complete', type: 'Southern Pine > 4 > 40', owner: 'COMMUNICATION > 001-AT&T',
    tip: "35' 11\"", ikePhoto: 1, commToLce: '76"',
    location: { lat: 37.6524, lng: -97.3275, altitude: "1220' 1\"" },
    taggedDate: '10/29/24 01:00PM',
  },
  {
    id: 'p-3977', poleNumber: '3977', opNumber: '019', externalId: '019-ST00579657',
    status: 'In Progress', type: 'Southern Pine > 4 > 35', owner: 'COMMUNICATION > 001-AT&T',
    tip: "33' 8\"", ikePhoto: 2, commToLce: '84"', commToComm: '21"',
    location: { lat: 37.652, lng: -97.3278, altitude: "1218' 9\"" },
    taggedDate: '01/15/25 11:20AM',
  },
  {
    id: 'p-3978', poleNumber: '3978', opNumber: '019', externalId: '019-ST00579658',
    status: 'HOA Complete', type: 'Douglas Fir > 3 > 45', owner: 'ELECTRIC > 002-Evergy',
    tip: "40' 2\"", ikePhoto: 1, commToLce: '68"', commToComm: '17"',
    location: { lat: 37.6516, lng: -97.3281, altitude: "1217' 4\"" },
    taggedDate: '02/28/23 04:50PM',
  },
  {
    id: 'p-3979', poleNumber: '3979', opNumber: '019', externalId: '019-ST00579659',
    status: 'Pending Review', type: 'Southern Pine > 4 > 40', owner: 'COMMUNICATION > 001-AT&T',
    tip: "36' 0\"", ikePhoto: 2, commToLce: '30"', commToComm: '20"',
    location: { lat: 37.6512, lng: -97.3284, altitude: "1219' 0\"" },
    taggedDate: '07/07/24 03:30AM',
  },
  {
    id: 'p-3980', poleNumber: '3980', opNumber: '020', externalId: '020-ST00579660',
    status: 'HOA Complete', type: 'Southern Pine > 4 > 40', owner: 'COMMUNICATION > 001-AT&T',
    tip: "35' 6\"", ikePhoto: 1, commToLce: '80"',
    location: { lat: 37.6508, lng: -97.3287, altitude: "1218' 2\"" },
    taggedDate: '08/19/25 06:15PM',
  },
  {
    id: 'p-3981', poleNumber: '3981', opNumber: '020', externalId: '020-ST00579661',
    status: 'In Progress', type: 'Douglas Fir > 3 > 50', owner: 'ELECTRIC > 002-Evergy',
    tip: "42' 1\"", ikePhoto: 2, commToLce: '65"', commToComm: '9"',
    location: { lat: 37.6504, lng: -97.329, altitude: "1217' 7\"" },
    taggedDate: '11/12/24 08:00AM',
  },
  {
    id: 'p-3982', poleNumber: '3982', opNumber: '020', externalId: '020-ST00579662',
    status: 'HOA Complete', type: 'Southern Pine > 4 > 40', owner: 'COMMUNICATION > 001-AT&T',
    tip: "34' 9\"", ikePhoto: 1, commToLce: '82"', commToComm: '23"',
    location: { lat: 37.65, lng: -97.3293, altitude: "1216' 11\"" },
    taggedDate: '04/01/21 12:45PM',
  },
  {
    id: 'p-3983', poleNumber: '3983', opNumber: '020', externalId: '020-ST00579663',
    status: 'Pending Review', type: 'Southern Pine > 5 > 45', owner: 'COMMUNICATION > 001-AT&T',
    tip: "37' 3\"", ikePhoto: 3, commToLce: '74"', commToComm: '19"',
    location: { lat: 37.6496, lng: -97.3296, altitude: "1215' 5\"" },
    taggedDate: '05/20/24 09:30PM',
  },
  {
    id: 'p-3984', poleNumber: '3984', opNumber: '020', externalId: '020-ST00579664',
    status: 'HOA Complete', type: 'Southern Pine > 4 > 40', owner: 'ELECTRIC > 002-Evergy',
    tip: "36' 8\"", ikePhoto: 1, commToLce: '78"',
    location: { lat: 37.6492, lng: -97.3299, altitude: "1214' 3\"" },
    taggedDate: '08/15/25 07:00AM',
  },
  {
    id: 'p-3985', poleNumber: '3985', opNumber: '020', externalId: '020-ST00579665',
    status: 'In Progress', type: 'Douglas Fir > 3 > 45', owner: 'COMMUNICATION > 001-AT&T',
    tip: "38' 5\"", ikePhoto: 2, commToLce: '71"', commToComm: '18"',
    location: { lat: 37.6488, lng: -97.3302, altitude: "1213' 9\"" },
    taggedDate: '12/30/24 12:25PM',
  },
  {
    id: 'p-3986', poleNumber: '3986', opNumber: '021', externalId: '021-ST00579666',
    status: 'HOA Complete', type: 'Southern Pine > 4 > 40', owner: 'COMMUNICATION > 001-AT&T',
    tip: "35' 2\"", ikePhoto: 1, commToLce: '83"', commToComm: '22"',
    location: { lat: 37.6484, lng: -97.3305, altitude: "1213' 1\"" },
    taggedDate: '03/05/26 03:35PM',
  },
  {
    id: 'p-3987', poleNumber: '3987', opNumber: '021', externalId: '021-ST00579667',
    status: 'HOA Complete', type: 'Southern Pine > 4 > 40', owner: 'ELECTRIC > 002-Evergy',
    tip: "36' 10\"", ikePhoto: 2, commToLce: '77"',
    location: { lat: 37.648, lng: -97.3308, altitude: "1212' 6\"" },
    taggedDate: '09/12/24 10:10AM',
  },
  {
    id: 'p-3988', poleNumber: '3988', opNumber: '021', externalId: '021-ST00579668',
    status: 'Pending Review', type: 'Douglas Fir > 3 > 45', owner: 'COMMUNICATION > 001-AT&T',
    tip: "37' 1\"", ikePhoto: 1, commToLce: '75"', commToComm: '20"',
    location: { lat: 37.6476, lng: -97.3311, altitude: "1211' 8\"" },
    taggedDate: '10/23/24 04:16PM',
  },
  {
    id: 'p-3989', poleNumber: '3989', opNumber: '021', externalId: '021-ST00579669',
    status: 'In Progress', type: 'Southern Pine > 4 > 40', owner: 'COMMUNICATION > 001-AT&T',
    tip: "35' 7\"", ikePhoto: 2, commToLce: '80"', commToComm: '21"',
    location: { lat: 37.6472, lng: -97.3314, altitude: "1210' 11\"" },
    taggedDate: '02/06/25 01:50PM',
  },
];

export const mockRuleSets: RuleSet[] = [
  {
    id: 'rs-nesc-2023',
    name: 'NESC 2023 Clearance Rules',
    description: 'National Electrical Safety Code 2023 - Section 23 clearance requirements',
    createdAt: '2024-01-15',
    rules: [
      { id: 'r-001', name: 'Comm to LCE Min Clearance', description: 'Communication to Lowest Conductor Electrical must maintain minimum 40" clearance', category: 'Clearance', severity: 'error' },
      { id: 'r-002', name: 'Comm to Comm Min Clearance', description: 'Communication to Communication vertical separation must be at least 12"', category: 'Clearance', severity: 'error' },
      { id: 'r-003', name: 'Ground Clearance', description: 'All communication attachments must be at least 15\' 6" from ground', category: 'Clearance', severity: 'error' },
      { id: 'r-004', name: 'Transit Clearance', description: 'Clearance over roads must be minimum 18\' for communication', category: 'Clearance', severity: 'warning' },
      { id: 'r-005', name: 'IKEphoto Required', description: 'At least one IKEphoto is required per pole', category: 'Documentation', severity: 'warning' },
    ]
  },
  {
    id: 'rs-att-make-ready',
    name: 'AT&T Make-Ready Standards',
    description: 'AT&T internal make-ready construction standards',
    createdAt: '2024-03-01',
    rules: [
      { id: 'r-006', name: 'Make-Ready Documentation', description: 'All poles with attachments require make-ready documentation', category: 'Documentation', severity: 'error' },
      { id: 'r-007', name: 'Overlash Compliance', description: 'Overlash must not exceed 1.5x original cable diameter', category: 'Construction', severity: 'warning' },
      { id: 'r-008', name: 'Pole Owner Consent', description: 'Pole owner must be identified for all attachments', category: 'Legal', severity: 'error' },
    ]
  },
  {
    id: 'rs-evergy-attach',
    name: 'Evergy Attachment Standards',
    description: 'Evergy utility company attachment compliance standards',
    createdAt: '2024-06-10',
    rules: [
      { id: 'r-009', name: 'Height Above Lowest Power', description: 'Comm attachments must be 40" below lowest primary conductor', category: 'Clearance', severity: 'error' },
      { id: 'r-010', name: 'Pole Load Capacity', description: 'New attachments cannot exceed 15% additional load on pole', category: 'Structural', severity: 'error' },
      { id: 'r-011', name: 'Weather Head Location', description: 'Weather head must be 3\' above top of pole or at required height', category: 'Construction', severity: 'warning' },
    ]
  }
];

// ─── Rule-run engine ──────────────────────────────────────────────────────────
// Computes per-pole validation results from the pole's current measurements.
// Re-running after edits reflects those changes, which drives the iterate loop.
// Missing measurements are treated as "not applicable" (pass) so only genuine
// out-of-spec values fail — keeping the demo's failures intentional.
export function computePoleResults(pole: Pole): PoleValidationResult[] {
  const commToLce = pole.commToLce ? parseInt(pole.commToLce) : null;
  const commToComm = pole.commToComm ? parseInt(pole.commToComm) : null;

  return [
    {
      ruleId: 'r-001',
      ruleName: 'Comm to LCE Min Clearance',
      status: commToLce === null || commToLce >= 40 ? 'pass' : 'fail',
      message: commToLce === null
        ? 'No Comm to LCE measurement (n/a)'
        : commToLce >= 40 ? `${commToLce}" clearance ✓` : `${commToLce}" is below 40" minimum`,
      severity: 'error'
    },
    {
      ruleId: 'r-002',
      ruleName: 'Comm to Comm Min Clearance',
      status: commToComm === null || commToComm >= 12 ? 'pass' : 'fail',
      message: commToComm === null
        ? 'No Comm to Comm measurement (n/a)'
        : commToComm >= 12 ? `${commToComm}" clearance ✓` : `${commToComm}" is below 12" minimum`,
      severity: 'error'
    },
    {
      ruleId: 'r-005',
      ruleName: 'IKEphoto Required',
      status: pole.ikePhoto > 0 ? 'pass' : 'fail',
      message: pole.ikePhoto > 0 ? `${pole.ikePhoto} IKEphoto(s) captured ✓` : 'No IKEphoto captured',
      severity: 'warning'
    },
    {
      ruleId: 'r-008',
      ruleName: 'Pole Owner Consent',
      status: pole.owner ? 'pass' : 'review',
      message: pole.owner ? `Owner: ${pole.owner} ✓` : 'Pole owner not identified',
      severity: 'error'
    },
  ];
}

// Map failing/warning rule results back to the editable fields they flag, so the
// right panel highlights exactly the fields that drove the failure.
export function deriveFieldIssues(results: PoleValidationResult[]): Record<string, FieldIssue> {
  const issues: Record<string, FieldIssue> = {};
  for (const r of results) {
    if (r.status !== 'fail' && r.status !== 'warning') continue;
    const issue: FieldIssue = r.status === 'fail' ? 'fail' : 'warning';
    if (r.ruleId === 'r-001') issues.commToLce = issue;
    if (r.ruleId === 'r-002') issues.commToComm = issue;
  }
  return issues;
}

/** Worst-case status for a single pole from its validation results. */
export function getPoleResultStatus(pole: Pole): 'pass' | 'warning' | 'fail' | 'review' | 'unverified' {
  const results = pole.validationResults ?? [];
  if (results.length === 0) return 'unverified';
  if (results.some(r => r.status === 'fail')) return 'fail';
  if (results.some(r => r.status === 'review')) return 'review';
  if (results.some(r => r.status === 'warning')) return 'warning';
  return 'pass';
}

// Recompute results + derived field issues for a pole and all of its variants.
function runOnePole(pole: Pole): Pole {
  const results = computePoleResults(pole);
  return {
    ...pole,
    validationResults: results,
    fieldIssues: deriveFieldIssues(results),
    variants: pole.variants?.map(runOnePole),
  };
}

/** Run a rule set against a set of poles: returns updated poles + a run record. */
export function runRulesOnPoles(
  poles: Pole[],
  ruleSet: RuleSet,
): { poles: Pole[]; run: ValidationRun } {
  const updated = poles.map(runOnePole);

  // Summary counts the top-level poles (variants are versions of a pole).
  const summary = { total: updated.length, pass: 0, fail: 0, warning: 0, review: 0 };
  for (const p of updated) {
    switch (getPoleResultStatus(p)) {
      case 'fail': summary.fail++; break;
      case 'warning': summary.warning++; break;
      case 'review': summary.review++; break;
      default: summary.pass++; break;
    }
  }

  const run: ValidationRun = {
    id: `run-${Date.now()}`,
    ruleSetId: ruleSet.id,
    ruleSetName: ruleSet.name,
    runAt: new Date().toISOString(),
    summary,
  };
  return { poles: updated, run };
}

/** Roll-up status used by the version tree (derived from the latest run). */
export function getVersionStatus(ds: DesignSet): VersionStatus {
  const run = ds.runHistory[0];
  if (!run) return 'unverified';
  if (run.summary.fail > 0) return 'failing';
  if (run.summary.warning > 0 || run.summary.review > 0) return 'warnings';
  return 'passed';
}

// Poles start "unverified" (neutral) with no flagged fields until a rule run.
const initialPoles = basePoles.map(p => ({
  ...p,
  spanCount: defaultSpans.length,
  spans: defaultSpans,
  fieldIssues: {} as Record<string, FieldIssue>,
  validationResults: [] as PoleValidationResult[],
}));

/** Build a fresh job (deep-cloned) — used on load and to reset the prototype. */
export function makeInitialJob(): Job {
  const job: Job = {
    id: 'job-louisville-43592',
    name: 'Louisville43592',
    source: 'IKE Office Pro',
    importedAt: '2025-08-18T10:45:00Z',
    account: 'Account Demo',
    activeDesignSetId: 'ds-original',
    designSets: [
      {
        id: 'ds-original',
        name: 'Original (Imported)',
        label: 'Original',
        isDuplicate: false,
        isOriginal: true,
        readOnly: true,
        scope: 'full',
        description: 'Imported from IKE Office Pro. Read-only — create a version to make changes.',
        createdAt: '2025-08-18T10:45:00Z',
        poles: initialPoles,
        runHistory: [],
      },
    ],
  };
  // Deep clone so each reset/load gets independent objects.
  return structuredClone(job);
}

export const mockJob: Job = makeInitialJob();
