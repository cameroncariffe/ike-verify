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
  validationResults?: PoleValidationResult[];
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

export interface DesignSet {
  id: string;
  name: string;
  label: string;
  parentId?: string;
  isDuplicate: boolean;
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
