export type TerritoryTypeCode =
  | 'COUNTRY'
  | 'REGION'
  | 'PROVINCE'
  | 'CITY'
  | 'ARRONDISSEMENT'
  | 'SECTOR'
  | 'VILLAGE'
  | 'NEIGHBORHOOD'
  | 'CUSTOM';

export interface TerritoryType {
  code: TerritoryTypeCode | string;
  label: string;
  order: number;
  optional: boolean;
}

export interface AllowedRelation {
  parent: string;
  child: string;
}

export interface TerritorialProfile {
  id: string;
  country_code: string;
  country_name: string;
  types: TerritoryType[];
  allowed_relations: AllowedRelation[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TerritorialUnit {
  id: string;
  country_code: string;
  type_code: string;
  name: string;
  normalized_name: string;
  parent_id: string | null;
  ancestor_ids: string[];
  depth: number;
  code: string | null;
  active: boolean;
  sort_order: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface TerritorialUnitWithChildren extends TerritorialUnit {
  children_count?: number;
  parent_name?: string | null;
}

export type ImportStatus =
  | 'UPLOADED'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'VALIDATION_FAILED'
  | 'COMMITTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface ImportStatistics {
  totalRows: number;
  created: number;
  reused: number;
  updated: number;
  duplicates: number;
  errors: number;
  reactivated: number;
}

export interface TerritorialImport {
  id: string;
  file_name: string;
  country_code: string;
  status: ImportStatus;
  statistics: ImportStatistics;
  idempotency_key: string;
  uploaded_by: string | null;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
}

export type RowStatus =
  | 'CREATE'
  | 'REUSE'
  | 'UPDATE'
  | 'REACTIVATE'
  | 'DUPLICATE_IN_FILE'
  | 'ERROR';

export type RowSeverity = 'ok' | 'warning' | 'error';

export interface ImportRow {
  id: string;
  import_id: string;
  row_number: number;
  path: string | null;
  type_code: string | null;
  name: string | null;
  status: RowStatus | null;
  parent_path: string | null;
  message: string | null;
  severity: RowSeverity;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, any>;
  created_at: string;
  created_by: string | null;
}

export interface ValidationResult {
  ok: boolean;
  code: string;
  message: string;
}

export const TYPE_LABELS: Record<string, string> = {
  COUNTRY: 'Pays',
  REGION: 'Région',
  PROVINCE: 'Province',
  CITY: 'Ville',
  ARRONDISSEMENT: 'Arrondissement',
  SECTOR: 'Secteur',
  VILLAGE: 'Village',
  NEIGHBORHOOD: 'Quartier',
  CUSTOM: 'Type personnalisé',
};

export const ROW_STATUS_LABELS: Record<string, string> = {
  CREATE: 'À créer',
  REUSE: 'Existe déjà',
  UPDATE: 'À actualiser',
  REACTIVATE: 'À réactiver',
  DUPLICATE_IN_FILE: 'Doublon dans le fichier',
  ERROR: 'Erreur',
};

export const ERROR_LABELS: Record<string, string> = {
  TERRITORIAL_UNIT_NOT_FOUND: 'Unité inexistante',
  TERRITORIAL_PARENT_INVALID: 'Parent invalide',
  TERRITORIAL_DUPLICATE: 'Doublon',
  TERRITORIAL_INVALID_RELATION: 'Relation interdite',
  TERRITORIAL_CYCLE_DETECTED: 'Cycle détecté',
  TERRITORIAL_UNIT_IN_USE: 'Unité utilisée',
  TERRITORIAL_UNIT_INACTIVE: 'Unité inactive',
  IMPORT_FILE_INVALID: 'Fichier invalide',
  IMPORT_COLUMN_MISSING: 'Colonne obligatoire manquante',
  IMPORT_VALIDATION_FAILED: 'Échec de validation',
  IMPORT_ALREADY_CONFIRMED: 'Import déjà confirmé',
  IMPORT_CONFIRMATION_CONFLICT: 'Conflit au moment de confirmer',
};
