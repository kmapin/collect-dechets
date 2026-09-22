export type AgencyImportType = 'clients' | 'employees';

export type ImportRowStatut = 'valide' | 'erreur' | 'doublon' | 'importe';

export interface ImportRowError {
  champ: string;
  valeur: any;
  message: string;
}

export interface ImportRow {
  ligne: number;
  // any (pas Record<string, any>) : le contenu varie selon le type (clients/employés)
  // et l'accès en point (ligne.donnees.firstName) dans les templates nécessiterait
  // sinon la notation indexée (noPropertyAccessFromIndexSignature du tsconfig).
  donnees: any;
  statut: ImportRowStatut;
  erreurs: ImportRowError[];
  userId?: string;
  motDePasseGenere?: string;
}

export interface ImportResume {
  total: number;
  valides: number;
  doublons: number;
  erreurs: number;
}

export interface ImportPreviewResponse {
  success: boolean;
  resume: ImportResume;
  colonnesInconnues: string[];
  lignes: ImportRow[];
}

export interface ImportConfirmResponse {
  success: boolean;
  total: number;
  importes: number;
  doublons: number;
  erreurs: number;
  lignes: ImportRow[];
}
