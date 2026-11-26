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

export interface ImportStatistics {
  totalRows: number;
  created: number;
  reused: number;
  duplicates: number;
  errors: number;
}

export type RowStatus =
  | 'CREATE'
  | 'VERIFIED'
  | 'REUSE'
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
  VERIFIED: 'Création confirmée',
  REUSE: 'Existe déjà',
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
