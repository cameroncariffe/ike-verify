export type ValidationStatus = 'pass' | 'fail' | 'warning' | 'review' | 'pending';

export interface PoleLocation {
  lat: number;
  lng: number;
  altitude?: string;
}

export interface Pole {
  id: string;
  poleNumber: string;
  opNumber: string;
  externalId: string;
  status: string;
  type: string;
  owner: string;
  circumference?: string;
  tip?: string;
  location: PoleLocation;
  ikePhoto: number;
  midSpanIkePhoto?: number;
  commToLce?: string;
  commToComm?: string;
  commToStlt?: string;
  note?: string;
  plaResult?: string;
  tagPhotos?: number;
  taggedDate: string;
  makeReady?: MakeReadyItem[];
  equipment?: EquipmentItem[];
  spanCount?: number;
  spans?: SpanDetail[];
  wires?: WireDetail[];
  spanGuys?: SpanGuyDetail[];
  fieldIssues?: Record<string, FieldIssue>;
  validationResults?: PoleValidationResult[];
  /** Pole-level versions, nested under this pole in the list. */
  variants?: Pole[];
  /** For a variant: the id of the base pole it was created from. */
  variantOf?: string;
  /** Display label for a variant, e.g. "Version 1". */
  variantLabel?: string;
  /** ISO timestamp for when a variant was created. */
  createdAt?: string;
}

export interface MakeReadyItem {
  id: number;
  description: string;
}

export interface EquipmentItem {
  id: string;
  type: string;
  owner: string;
  height?: string;
}

export type DetailColor =
  | 'neutral' | 'red' | 'orange' | 'amber' | 'lime' | 'emerald' | 'blue';

export type FieldIssue = 'fail' | 'warning';

export interface SpanDetail {
  id: string;
  label: string;
  color: DetailColor;
  length?: string;
  type?: string;
  environment?: string;
  midSpanIkePhoto?: number;
  note?: string;
  commToSecEvergy?: string;
  commToNeutEvergy?: string;
  commToCommEvergy?: string;
  commToSecNesc?: string;
  commToNeutNesc?: string;
  commToCommNesc?: string;
  wires?: WireDetail[];
  issues?: Record<string, FieldIssue>;
}

export interface WireDetail {
  id: string;
  label: string;
  color: DetailColor;
}

export interface SpanGuyDetail {
  id: string;
  label: string;
  color: DetailColor;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'error' | 'warning' | 'info';
}

export interface PoleValidationResult {
  ruleId: string;
  ruleName: string;
  status: ValidationStatus;
  message?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface RuleSet {
  id: string;
  name: string;
  description: string;
  rules: ValidationRule[];
  createdAt: string;
}

export type VersionStatus = 'unverified' | 'passed' | 'warnings' | 'failing';

export interface DesignSet {
  id: string;
  name: string;
  label: string;
  parentId?: string;
  isDuplicate: boolean;
  /** True only for the imported job version. */
  isOriginal?: boolean;
  /** Read-only versions (the Original import) can be run but not edited. */
  readOnly?: boolean;
  /** Optional notes describing the work this version captures. */
  description?: string;
  /** e.g. Proposed / Existing / Remedy. */
  variantType?: string;
  /** 'full' versions hold every pole; 'partial' versions own a subset. */
  scope?: 'full' | 'partial';
  /** For partial versions: the pole ids this version owns/focuses on. */
  poleIds?: string[];
  createdAt: string;
  poles: Pole[];
  runHistory: ValidationRun[];
}

export interface ValidationRun {
  id: string;
  ruleSetId: string;
  ruleSetName: string;
  runAt: string;
  summary: {
    total: number;
    pass: number;
    fail: number;
    warning: number;
    review: number;
  };
}

export interface Job {
  id: string;
  name: string;
  source: 'IKE Office Pro';
  importedAt: string;
  account: string;
  designSets: DesignSet[];
  activeDesignSetId: string;
}
