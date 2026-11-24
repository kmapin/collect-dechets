// Données mockées — découpage territorial du Burkina Faso (fictif mais réaliste)

export interface MockUnit {
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

let seq = 0;
const uid = (k: string) => `mock-${k}-${++seq}`;
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export const MOCK_PROFILE = {
  id: 'mock-profile-bf',
  country_code: 'BF',
  country_name: 'Burkina Faso',
  types: [
    { code: 'COUNTRY', label: 'Pays', order: 0, optional: false },
    { code: 'REGION', label: 'Région', order: 1, optional: false },
    { code: 'PROVINCE', label: 'Province', order: 2, optional: false },
    { code: 'CITY', label: 'Ville', order: 3, optional: false },
    { code: 'ARRONDISSEMENT', label: 'Arrondissement', order: 4, optional: true },
    { code: 'SECTOR', label: 'Secteur', order: 5, optional: false },
    { code: 'VILLAGE', label: 'Village', order: 6, optional: true },
    { code: 'NEIGHBORHOOD', label: 'Quartier', order: 7, optional: true },
  ],
  allowed_relations: [
    { parent: 'COUNTRY', child: 'REGION' },
    { parent: 'REGION', child: 'PROVINCE' },
    { parent: 'PROVINCE', child: 'CITY' },
    { parent: 'CITY', child: 'ARRONDISSEMENT' },
    { parent: 'CITY', child: 'SECTOR' },
    { parent: 'CITY', child: 'VILLAGE' },
    { parent: 'CITY', child: 'NEIGHBORHOOD' },
    { parent: 'ARRONDISSEMENT', child: 'SECTOR' },
    { parent: 'ARRONDISSEMENT', child: 'VILLAGE' },
    { parent: 'ARRONDISSEMENT', child: 'NEIGHBORHOOD' },
  ],
  active: true,
  created_at: daysAgo(90),
  updated_at: daysAgo(10),
};

export const MOCK_UNITS: MockUnit[] = (() => {
  const units: MockUnit[] = [];
  const push = (
    key: string,
    type_code: string,
    name: string,
    parent: MockUnit | null,
    opts: Partial<MockUnit> = {}
  ): MockUnit => {
    const u: MockUnit = {
      id: uid(key),
      country_code: 'BF',
      type_code,
      name,
      normalized_name: name.toLowerCase(),
      parent_id: parent?.id ?? null,
      ancestor_ids: parent ? [...parent.ancestor_ids, parent.id] : [],
      depth: parent ? parent.depth + 1 : 0,
      code: opts.code ?? null,
      active: opts.active ?? true,
      sort_order: opts.sort_order ?? 0,
      metadata: opts.metadata ?? {},
      created_at: opts.created_at ?? daysAgo(60),
      updated_at: opts.updated_at ?? daysAgo(30),
      created_by: opts.created_by ?? 'admin',
      updated_by: opts.updated_by ?? 'admin',
    };
    units.push(u);
    return u;
  };

  const bf = push('bf', 'COUNTRY', 'Burkina Faso', null, { code: 'BF', created_at: daysAgo(120) });

  // ===== Centre =====
  const centre = push('centre', 'REGION', 'Centre', bf, { code: '01' });
  const kadiogo = push('kadiogo', 'PROVINCE', 'Kadiogo', centre, { code: '33' });
  const ouaga = push('ouaga', 'CITY', 'Ouagadougou', kadiogo, { code: 'OUA' });
  const a1 = push('a1', 'ARRONDISSEMENT', 'Arrondissement 1', ouaga, { sort_order: 1, code: 'OUA-01' });
  const a2 = push('a2', 'ARRONDISSEMENT', 'Arrondissement 2', ouaga, { sort_order: 2, code: 'OUA-02' });
  const a3 = push('a3', 'ARRONDISSEMENT', 'Arrondissement 3', ouaga, { sort_order: 3, code: 'OUA-03' });
  push('s1', 'SECTOR', 'Secteur 1', a1, { sort_order: 1 });
  push('s2', 'SECTOR', 'Secteur 2', a1, { sort_order: 2 });
  push('s3', 'SECTOR', 'Secteur 3', a1, { sort_order: 3 });
  push('s4', 'SECTOR', 'Secteur 4', a2, { sort_order: 4 });
  push('s5', 'SECTOR', 'Secteur 5', a2, { sort_order: 5 });
  push('s6', 'SECTOR', 'Secteur 6', a3, { sort_order: 6 });
  push('q1', 'NEIGHBORHOOD', 'Quartier Tanghin', a1);
  push('q2', 'NEIGHBORHOOD', 'Quartier Gounghin', a2);
  push('q3', 'NEIGHBORHOOD', 'Quartier Djiba', a3, { active: false });

  // ===== Centre-Ouest =====
  const co = push('co', 'REGION', 'Centre-Ouest', bf, { code: '05' });
  const sissili = push('sissili', 'PROVINCE', 'Sissili', co, { code: '48' });
  const leons = push('leons', 'CITY', 'Léo', sissili, { code: 'LEO' });
  push('leo-s1', 'SECTOR', 'Secteur A', leons);
  push('leo-s2', 'SECTOR', 'Secteur B', leons);
  push('leo-v1', 'VILLAGE', 'Village Bouna', sissili === undefined ? leons : leons, { active: true });
  push('ziro', 'PROVINCE', 'Ziro', co, { code: '55' });
  push('sapouy', 'CITY', 'Sapouy', units[units.length - 1], { code: 'SAP' });

  // ===== Hauts-Bassins =====
  const hb = push('hb', 'REGION', 'Hauts-Bassins', bf, { code: '09' });
  const houet = push('houet', 'PROVINCE', 'Houet', hb, { code: '34' });
  const bobo = push('bobo', 'CITY', 'Bobo-Dioulasso', houet, { code: 'BOB' });
  const ba1 = push('ba1', 'ARRONDISSEMENT', 'Arrondissement 1', bobo, { sort_order: 1 });
  const ba2 = push('ba2', 'ARRONDISSEMENT', 'Arrondissement 2', bobo, { sort_order: 2 });
  const ba3 = push('ba3', 'ARRONDISSEMENT', 'Arrondissement 3', bobo, { sort_order: 3 });
  push('b1', 'SECTOR', 'Secteur 1', ba1, { sort_order: 1 });
  push('b2', 'SECTOR', 'Secteur 2', ba1, { sort_order: 2 });
  push('b3', 'SECTOR', 'Secteur 3', ba2, { sort_order: 3 });
  push('b4', 'SECTOR', 'Secteur 4', ba3, { sort_order: 4 });
  push('bq1', 'NEIGHBORHOOD', 'Quartier Ouezzin-Ville', ba1);

  // ===== Sahel =====
  const sahel = push('sahel', 'REGION', 'Sahel', bf, { code: '13' });
  const oudalan = push('oudalan', 'PROVINCE', 'Oudalan', sahel, { code: '27' });
  const gorom = push('gorom', 'CITY', 'Gorom-Gorom', oudalan, { code: 'GRO' });
  push('g-v1', 'VILLAGE', 'Village Tin-Akoff', gorom);
  push('g-v2', 'VILLAGE', 'Village Oursi', gorom);
  push('markoye', 'PROVINCE', 'Séno', sahel, { code: '45' });
  const dori = push('dori', 'CITY', 'Dori', units[units.length - 1], { code: 'DOR' });
  push('d-s1', 'SECTOR', 'Secteur 1', dori, { sort_order: 1 });
  push('d-s2', 'SECTOR', 'Secteur 2', dori, { sort_order: 2 });

  // ===== Cascades =====
  const casc = push('casc', 'REGION', 'Cascades', bf, { code: '02' });
  const comoe = push('comoe', 'PROVINCE', 'Comoé', casc, { code: '15' });
  const banfora = push('banfora', 'CITY', 'Banfora', comoe, { code: 'BAN' });
  push('bf-s1', 'SECTOR', 'Secteur 1', banfora, { sort_order: 1 });
  push('bf-s2', 'SECTOR', 'Secteur 2', banfora, { sort_order: 2 });
  push('bf-v1', 'VILLAGE', 'Village Soubahan', banfora, { active: false });

  // ===== Est =====
  const est = push('est', 'REGION', 'Est', bf, { code: '04' });
  const gourma = push('gourma', 'PROVINCE', 'Gourma', est, { code: '21' });
  const fada = push('fada', 'CITY', 'Fada N\'Gourma', gourma, { code: 'FAD' });
  push('f-s1', 'SECTOR', 'Secteur 1', fada, { sort_order: 1 });
  push('f-s2', 'SECTOR', 'Secteur 2', fada, { sort_order: 2 });

  return units;
})();
