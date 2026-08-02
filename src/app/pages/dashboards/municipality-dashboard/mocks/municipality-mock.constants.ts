/**
 * Static name/value pools used by the Municipality Dashboard mock generators.
 * Kept separate from the generator functions so the "content" (what names
 * exist) can be tweaked without touching the "logic" (how they're combined).
 */
import { OUAGA_DATA } from '../../../../data/mock-data';
import { MOCK_CITIES } from '../../../../data/countries-org.mock';
import { BF_CITY_COORDS, OUAGA_ARR_COORDS } from '../../../../data/ouaga-coords';
import type { MunicipalityZone } from './municipality-mock.types';

export const DEFAULT_SEED = 20260801;

/**
 * Real coordinates for the non-Burkina-Faso capitals/major cities also
 * listed in `MOCK_CITIES` (Mali, Niger, Côte d'Ivoire, Ghana) — `ouaga-coords.ts`
 * is scoped to Burkina Faso only (its own name says so), so without this,
 * 8 of the 23 cities `loadZoneStat()` builds table rows for would silently
 * get no map marker at all, even though they're shown in the tabular view.
 */
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

/**
 * Coverage Map (Prompt 13) coordinate lookup, keyed by the exact zone/city
 * name already used elsewhere in the app — reuses the project's existing,
 * real-world-plausible coordinate data (`data/ouaga-coords.ts`, already
 * powering the agency-level maps in admin-dashboard.ts/team-dashboard.ts)
 * instead of inventing new mock lat/lng pairs. Covers every granularity
 * "Couverture Territoriale" might need: city-level (`BF_CITY_COORDS` +
 * `OTHER_COUNTRY_CITY_COORDS`, what `zoneStatistics` actually uses today —
 * see loadZoneStat()) and arrondissement-level (`OUAGA_ARR_COORDS`,
 * matching `MUNICIPALITY_ZONES`), merged into one map so a caller doesn't
 * need to know which granularity a given name belongs to.
 */
export const ZONE_COORDINATES: Record<string, [number, number]> = {
  ...BF_CITY_COORDS,
  ...OTHER_COUNTRY_CITY_COORDS,
  ...OUAGA_ARR_COORDS,
};

/** Simulated network latency for Observable-returning mock methods, so a loading state is actually visible/testable. */
export const MOCK_NETWORK_DELAY_MS = 450;

/**
 * How many days of `generateWasteRecords()` history exist — the single
 * shared source of truth behind the Waste Breakdown chart (Prompt 07), the
 * Collection Evolution chart (Prompt 08), and Volume Global Collecté
 * (Prompt 11). All three filter/aggregate the SAME full-range record set
 * rather than each calling `generateWasteRecords()` with their own `days`
 * value — the generator's PRNG stream is consumed oldest-day-first, so
 * requesting a different `days` shifts which random draws land on any given
 * calendar day, and the "same" recent days would silently produce different
 * records depending on which feature asked for them. 400 days safely covers
 * 12 full calendar months back from any day of the year (12*31 + up to 31
 * days of margin for where "today" falls in its own month).
 */
export const FULL_HISTORY_DAYS = 400;

/**
 * Zones reused as-is from the project's existing Ouagadougou fixture
 * (`OUAGA_DATA`) instead of inventing parallel arrondissement/quartier
 * names — this is the same data already rendered on other screens.
 */
export const MUNICIPALITY_ZONES: MunicipalityZone[] = OUAGA_DATA.map((entry) => ({
  id: entry.arrondissement.replace(/\s+/g, '-').toLowerCase(),
  name: entry.arrondissement,
  cityName: MOCK_CITIES[0].name, // Ouagadougou
  countryName: MOCK_CITIES[0].country.name, // Burkina Faso
  quartiers: entry.secteurs.flatMap((s) => s.quartiers),
}));

/**
 * Agency name pool. The first three match the ones already hand-written
 * (commented out) in `municipality-dashboard.ts::loadAgencyAudits()` so a
 * dev comparing old mock output to this one recognizes the continuity.
 */
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

/**
 * Waste categories reused verbatim (labels + colors) from
 * `municipality-dashboard.ts::loadWasteStatistics()` so the mock layer stays
 * visually consistent with what's already on screen today. `baseSharePct`
 * drives a WEIGHTED pick in generateWasteRecords() (see pickWeighted) —
 * tuned so realized shares land inside household 45–60% / recyclables
 * 15–25% / organic 10–20% / glass 5–10%, per the Waste Breakdown Chart prompt.
 */
export const WASTE_TYPE_POOL: { label: string; color: string; baseSharePct: number }[] = [
  { label: 'Déchets ménagers', color: '#4caf50', baseSharePct: 52 },
  { label: 'Recyclables', color: '#2196f3', baseSharePct: 20 },
  { label: 'Organiques', color: '#8bc34a', baseSharePct: 18 },
  { label: 'Verre', color: '#00bcd4', baseSharePct: 10 },
];

/**
 * Baseline planned collection cadence per waste category, a realistic
 * municipal policy default (household waste collected most often, glass
 * least often). `generateZoneFrequencyRecords()` uses this as the common
 * case, with occasional per-zone deviation so it's not identical everywhere.
 */
export const WASTE_TYPE_BASELINE_FREQUENCY: Record<string, 'daily' | 'weekly' | 'monthly'> = {
  'Déchets ménagers': 'daily',
  Recyclables: 'weekly',
  Organiques: 'weekly',
  Verre: 'monthly',
};

/**
 * Planned/target weight (kg) per collection, per waste category — "Volume
 * Global Collecté" (Prompt 11)'s target-modeling, same convention as
 * Prompt 09's per-collector `target` and Prompt 10's per-zone
 * `plannedFrequency`: every record carries both an actual value
 * (`weightKg`, already random per collection) and a target one
 * (`targetWeightKg`, a fixed realistic per-category baseline), so summing
 * either across any filtered scope gives a genuine actual-vs-target
 * comparison without a separate, disconnected target dataset.
 */
export const WASTE_TYPE_TARGET_WEIGHT_KG: Record<string, number> = {
  'Déchets ménagers': 95,
  Recyclables: 70,
  Organiques: 60,
  Verre: 40,
};

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
