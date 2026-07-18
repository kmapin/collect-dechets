import { Periode } from '../../../models';
import { DERNIERE_PERIODE } from './seed.util';

// Points d'entrée nommés pour les scénarios limites du dataset (spec Mock Data Strategy §5),
// regroupés ici pour que les features (Prompt 7+) n'aient pas à connaître le détail de
// génération de chaque fichier *.data.ts.
export { CLIENT_SANS_HISTORIQUE_ID } from './clients.data';
export { PERIODE_VIDE } from './factures.data';

/** Dernière période couverte par l'historique généré (au-delà : PERIODE_VIDE). */
export const DERNIERE_PERIODE_HISTORIQUE: Periode = DERNIERE_PERIODE;
