import { OUAGA_DATA } from '../../../../data/mock-data';
import { MOCK_CITIES } from '../../../../data/countries-org.mock';
import { BF_CITY_COORDS, OUAGA_ARR_COORDS } from '../../../../data/ouaga-coords';
import type { MunicipalityZone } from './municipality-mock.types';

export const DEFAULT_SEED = 20260801;

const OTHER_COUNTRY_CITY_COORDS: Record<string, [number, number]> = {
  Bamako: [12.6392, -8.0029],
  Sikasso: [11.3167, -5.6667],
  Niamey: [13.5137, 2.1098],
  Zinder: [13.8069, 8.9881],
  Abidjan: [5.36, -4.0083],
  Yamoussoukro: [6.8276, -5.2893],
  Accra: [5.6037, -0.187],
  Kumasi: [6.6885, -1.6244],
};

export const ZONE_COORDINATES: Record<string, [number, number]> = {
  ...BF_CITY_COORDS,
  ...OTHER_COUNTRY_CITY_COORDS,
  ...OUAGA_ARR_COORDS,
};

/** Simulated network latency for Observable-returning mock methods, so a loading state is actually visible/testable. */
export const MOCK_NETWORK_DELAY_MS = 450;


export const MUNICIPALITY_ZONES: MunicipalityZone[] = OUAGA_DATA.map((entry) => ({
  id: entry.arrondissement.replace(/\s+/g, '-').toLowerCase(),
  name: entry.arrondissement,
  cityName: MOCK_CITIES[0].name, // Ouagadougou
  countryName: MOCK_CITIES[0].country.name, // Burkina Faso
  quartiers: entry.secteurs.flatMap((s) => s.quartiers),
}));

export const AGENCY_NAME_POOL: string[] = [
  'EcoClean Services',
  'GreenWaste Solutions',
  'WasteManager Pro',
  'Azimmo Propreté',
  'Faso Hygiène Collecte',
  'WISE Clean Ouaga',
  'Sahel Environnement',
  'Koodo Assainissement',
  'Pure Cité Services',
  'Bâtir Vert Collecte',
  'Yiriwa Environnement',
  'Cité Propre Burkina',
  'Naaba Assainissement',
  'Teel-Taaba Environnement',
  'Kossodo Recyclage',
];

export const AGENCY_STATUS_POOL: string[] = ['active', 'active', 'active', 'inactive', 'suspended'];

export const AGENCY_ISSUE_POOL: string[] = [
  'Retards fréquents',
  'Signalements clients',
  'Non-conformité réglementaire',
  'Licence à renouveler',
  'Sous-effectif collecteurs',
  'Zone mal couverte',
];

export const COLLECTOR_FIRST_NAMES: string[] = [
  'Issa', 'Aminata', 'Boureima', 'Fatimata', 'Rasmané', 'Salimata',
  'Ousmane', 'Awa', 'Moumouni', 'Aïcha', 'Sibiri', 'Mariam',
  'Adama', 'Bintou', 'Yacouba', 'Rachel', 'Karim', 'Delphine',
];

export const COLLECTOR_LAST_NAMES: string[] = [
  'Ouédraogo', 'Compaoré', 'Kaboré', 'Zongo', 'Sawadogo', 'Traoré',
  'Kiendrébéogo', 'Sanou', 'Bationo', 'Nikiéma', 'Ilboudo', 'Some',
];

export const WASTE_TYPE_POOL: { label: string; color: string; baseSharePct: number }[] = [
  { label: 'Déchets ménagers', color: '#4caf50', baseSharePct: 52 },
  { label: 'Recyclables', color: '#2196f3', baseSharePct: 20 },
  { label: 'Organiques', color: '#8bc34a', baseSharePct: 18 },
  { label: 'Verre', color: '#00bcd4', baseSharePct: 10 },
];


export const INCIDENT_TYPE_POOL: Array<'missed_collection' | 'compliance_issue' | 'complaint' | 'technical_issue'> = [
  'missed_collection',
  'compliance_issue',
  'complaint',
  'technical_issue',
];

export const INCIDENT_SEVERITY_POOL: Array<'Low' | 'Medium' | 'High' | 'Critical'> = [
  'Low',
  'Medium',
  'High',
  'Critical',
];

export const INCIDENT_STATUS_POOL: Array<'open' | 'pending' | 'resolved'> = ['open', 'pending', 'resolved'];

export const INCIDENT_COMMENT_POOL: string[] = [
  'Bac non vidé depuis 3 jours.',
  'Odeurs persistantes signalées par le voisinage.',
  'Agent de collecte absent sans préavis.',
  'Tri sélectif non respecté par le camion.',
  'Débordement de déchets sur la voie publique.',
  'Retard de plus de 4 heures sur le créneau prévu.',
];
