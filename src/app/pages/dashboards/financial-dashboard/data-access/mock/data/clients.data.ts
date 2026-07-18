import { Client, ClientStatut } from '../../../models';
import { addMois, createSeededRng, DERNIERE_PERIODE, pick } from './seed.util';

// Réutilise le vocabulaire de quartiers déjà présent dans le repo
// (src/app/pages/dashboards/admin-dashboard/admin-dashboard.ts — OUAGA_COORDS / OUAGA_DATA)
// plutôt que d'inventer des noms fictifs.
const QUARTIERS = [
  'Tampouy', 'Cissin', 'Pissy', 'Zogona', 'Hamdalaye', 'Dapoya',
  'Larlé', 'Wemtenga', 'Dassasgho', 'Karpala', 'Nagrin', 'Kossodo',
  'Somgandé', 'Bendogo', 'Sogdin', "Patte d'Oie", 'Zangouettin', 'Gounghin',
] as const;

const NOMS = [
  'Ouédraogo', 'Zongo', 'Sawadogo', 'Kaboré', 'Traoré', 'Compaoré', 'Kiemtoré',
  'Kafando', 'Nikiema', 'Bationo', 'Ilboudo', 'Bassolet', 'Tapsoba', 'Zoungrana',
  'Yaméogo', 'Sanou', 'Coulibaly', 'Kambou', 'Sanogo', 'Bamogo',
] as const;

const PRENOMS = [
  'Awa', 'Boureima', 'Rasmata', 'Issouf', 'Fatimata', 'Adama', 'Aminata',
  'Boukary', 'Salimata', 'Moussa', 'Habibou', 'Mariam', 'Yacouba', 'Rachidatou',
  'Abdoulaye', 'Aïcha', 'Seydou', 'Zenabo', 'Ousmane', 'Djeneba',
] as const;

const rng = createSeededRng(42);

// La spec (Mock Data Strategy §5) mentionne "2–3 agences" pour la diversité du jeu de
// données. Le modèle Client (Table 20) ne porte pas de référence agence — cette
// variation est donc simulée uniquement par la diversité des quartiers, pas par un
// champ persisté (voir ARCHITECTURE.md / DISCOVERY.md).
const NB_CLIENTS_NORMAUX = 47;

function genererTelephone(index: number): string | undefined {
  if (index % 11 === 0) return undefined; // ~9% sans téléphone — champ facultatif (§1.9)
  const indicatif = index % 2 === 0 ? '70' : '78';
  const bloc2 = String(10 + (index % 90)).padStart(2, '0');
  const bloc3 = String((index * 3) % 100).padStart(2, '0');
  const bloc4 = String((index * 7) % 100).padStart(2, '0');
  return `+226 ${indicatif} ${bloc2} ${bloc3} ${bloc4}`;
}

function genererDateCreation(index: number): string {
  const decalageMois = (index * 5) % 20; // étalé sur ~20 mois d'ancienneté
  const periode = addMois(DERNIERE_PERIODE, -decalageMois);
  const jour = String(1 + (index % 27)).padStart(2, '0');
  return `${periode.annee}-${String(periode.mois).padStart(2, '0')}-${jour}`;
}

function genererClientNormal(index: number): Client {
  return {
    idClient: `cli-${String(index + 1).padStart(3, '0')}`,
    nom: NOMS[index % NOMS.length],
    prenom: pick(rng, PRENOMS),
    quartier: QUARTIERS[(index * 3) % QUARTIERS.length],
    telephone: genererTelephone(index),
    statut: index % 7 === 0 ? ClientStatut.INACTIF : ClientStatut.ACTIF, // ~14% inactifs (RG6)
    dateCreation: genererDateCreation(index),
  };
}

const CLIENTS_NORMAUX: Client[] = Array.from({ length: NB_CLIENTS_NORMAUX }, (_, i) => genererClientNormal(i));

// Scénario "client sans historique" (spec §5) : vient de s'inscrire, aucune facture
// générée pour lui — son abonnement (abonnements.data.ts) démarre après la fenêtre
// d'historique, donc factures.data.ts ne lui génère volontairement aucune ligne.
export const CLIENT_SANS_HISTORIQUE_ID = 'cli-048';

const CLIENT_SANS_HISTORIQUE: Client = {
  idClient: CLIENT_SANS_HISTORIQUE_ID,
  nom: 'Compaoré',
  prenom: 'Wend-Kuni',
  quartier: 'Ouaga 2000',
  telephone: '+226 70 00 00 00',
  statut: ClientStatut.ACTIF,
  dateCreation: '2026-07-18',
};

export const CLIENTS: Client[] = [...CLIENTS_NORMAUX, CLIENT_SANS_HISTORIQUE];
