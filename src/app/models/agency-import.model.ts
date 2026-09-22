export type AgencyImportType = 'clients' | 'employees';

// 'existant' : client uniquement — le téléphone correspond à un client déjà en base, aucun
// nouveau compte n'est créé mais un abonnement (obligatoirement fourni pour ce statut) lui
// sera rattaché à la confirmation. Jamais utilisé pour les employés.
export type ImportRowStatut = 'valide' | 'existant' | 'erreur' | 'doublon' | 'importe';

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
  // Abonnement (clients uniquement, facultatif dans le fichier) :
  subscriptionId?: string;
  /** true si l'abonnement existait déjà (aucun nouvel abonnement créé — anti-doublon). */
  abonnementDejaExistant?: boolean;
  /** Renseigné si le client a bien été créé/rattaché mais que l'abonnement, lui, a échoué. */
  abonnementErreur?: string;
  // Contrat (clients uniquement, facultatif, indépendant de l'abonnement) :
  contratId?: string;
  /** true si un contrat actif existait déjà pour ce lieu (aucun nouveau contrat créé). */
  contratDejaExistant?: boolean;
  /** Renseigné si le client a bien été créé/rattaché mais que le contrat, lui, a échoué. */
  contratErreur?: string;
}

export interface ImportResume {
  total: number;
  valides: number;
  doublons: number;
  erreurs: number;
  // Présent uniquement pour l'import clients (jamais pour les employés) — voir
  // services/agencyImport.js::recapitulatif côté backend.
  existants?: number;
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
