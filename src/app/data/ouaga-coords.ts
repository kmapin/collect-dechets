/** Coordonnées GPS de référence pour Ouagadougou et le Burkina Faso.
 *  Précision : ~200–500 m pour les quartiers/secteurs (centroïdes estimés).
 *  Format : [latitude, longitude] (WGS-84).
 */

// ─── Villes du Burkina Faso ───────────────────────────────────────────────────

export const BF_CITY_COORDS: Record<string, [number, number]> = {
  'Ouagadougou':    [12.3647, -1.5337],
  'Bobo-Dioulasso': [11.1771, -4.2979],
  'Koudougou':      [12.2500, -2.3667],
  'Banfora':        [10.6335, -4.7592],
  'Ouahigouya':     [13.5728, -2.4219],
  'Pouytenga':      [12.2461, -0.8750],
  'Dédougou':       [12.4605, -3.4614],
  'Kaya':           [13.1008, -1.0926],
  'Tenkodogo':      [11.7833, -0.3667],
  "Fada N'Gourma":  [12.0601,  0.3584],
  'Manga':          [11.6667, -1.0667],
  'Réo':            [12.3167, -2.4667],
  'Ziniaré':        [12.5833, -1.2833],
  'Zorgho':         [12.2500, -0.6167],
  'Kongoussi':      [13.3272, -1.5317],
  'Gaoua':          [10.3333, -3.1833],
  'Dori':           [14.0333,  0.0333],
  'Djibo':          [14.1000, -1.6333],
  'Titao':          [13.7667, -2.0833],
  'Tougan':         [13.0667, -3.0667],
  'Diébougou':      [10.9667, -3.2500],
  'Bogandé':        [12.9833,  0.1333],
  'Batié':          [10.0333, -2.9000],
  'Nouna':          [12.7333, -3.8667],
  'Léo':            [11.1000, -2.0833],
  'Garango':        [11.8000, -0.5333],
  'Boromo':         [11.7333, -2.9333],
  'Kombissiri':     [12.0681, -1.3347],
  'Pô':             [11.1667, -1.1500],
  'Yako':           [12.9500, -2.2667],
};

// ─── Arrondissements de Ouagadougou ──────────────────────────────────────────

export const OUAGA_ARR_COORDS: Record<string, [number, number]> = {
  'Arrondissement 1':  [12.3647, -1.5195],  // Baskuy — centre historique
  'Arrondissement 2':  [12.3715, -1.5450],  // nord-ouest — Goughin/Hamdalaye
  'Arrondissement 3':  [12.3536, -1.5181],  // est — Dapoya II/Camp militaire
  'Arrondissement 4':  [12.3968, -1.5315],  // nord — Tampouy/Somgandé
  'Arrondissement 5':  [12.3808, -1.5118],  // nord-est — Sogdin/Wemtenga
  'Arrondissement 6':  [12.3528, -1.5540],  // sud-ouest — Pissy/Cissin
  'Arrondissement 7':  [12.3411, -1.5280],  // sud — Nagrin/Sandogo
  'Arrondissement 8':  [12.3393, -1.5077],  // sud-est — Nonghin/Bissighin
  'Arrondissement 9':  [12.3600, -1.4895],  // est lointain — Marcoussis/Kamboissin
  'Arrondissement 10': [12.4000, -1.4968],  // nord-est lointain — Kossodo/Dassasgho
  'Arrondissement 11': [12.3375, -1.5490],  // sud-ouest lointain — Karpala/Balkuy
  'Arrondissement 12': [12.3353, -1.5303],  // sud — Ouaga 2000/Kossyam
};

// ─── Secteurs de Ouagadougou (1–55) ──────────────────────────────────────────

export const OUAGA_SECTOR_COORDS: Record<string, [number, number]> = {
  // Arrondissement 1
  'Secteur 1':  [12.3742, -1.5218],
  'Secteur 2':  [12.3685, -1.5233],
  'Secteur 3':  [12.3650, -1.5255],
  'Secteur 4':  [12.3640, -1.5190],
  'Secteur 5':  [12.3608, -1.5147],
  // Arrondissement 2
  'Secteur 6':  [12.3680, -1.5430],
  'Secteur 7':  [12.3720, -1.5440],
  'Secteur 8':  [12.3730, -1.5410],
  'Secteur 9':  [12.3680, -1.5470],
  'Secteur 10': [12.3750, -1.5480],
  // Arrondissement 3
  'Secteur 11': [12.3620, -1.5220],
  'Secteur 12': [12.3580, -1.5180],
  'Secteur 13': [12.3550, -1.5150],
  'Secteur 14': [12.3500, -1.5200],
  'Secteur 15': [12.3450, -1.5150],
  // Arrondissement 4
  'Secteur 16': [12.3950, -1.5480],
  'Secteur 17': [12.3885, -1.5505],
  'Secteur 18': [12.4000, -1.5320],
  'Secteur 19': [12.4080, -1.5050],
  // Arrondissement 5
  'Secteur 20': [12.3850, -1.5200],
  'Secteur 21': [12.3820, -1.5150],
  'Secteur 22': [12.3750, -1.5350],
  'Secteur 23': [12.3753, -1.5040],
  // Arrondissement 6
  'Secteur 24': [12.3520, -1.5470],
  'Secteur 25': [12.3520, -1.5580],
  'Secteur 26': [12.3490, -1.5515],
  'Secteur 27': [12.3560, -1.5620],
  'Secteur 28': [12.3560, -1.5450],
  'Secteur 29': [12.3575, -1.5570],
  // Arrondissement 7
  'Secteur 30': [12.3450, -1.5350],
  'Secteur 31': [12.3430, -1.5200],
  'Secteur 32': [12.3400, -1.5300],
  'Secteur 33': [12.3350, -1.5250],
  // Arrondissement 8
  'Secteur 34': [12.3400, -1.5150],
  'Secteur 35': [12.3400, -1.5080],
  'Secteur 36': [12.3380, -1.5000],
  // Arrondissement 9
  'Secteur 37': [12.3600, -1.4950],
  'Secteur 38': [12.3550, -1.4900],
  'Secteur 39': [12.3650, -1.4900],
  'Secteur 40': [12.3600, -1.4830],
  // Arrondissement 10
  'Secteur 41': [12.4130, -1.4990],
  'Secteur 42': [12.4050, -1.4950],
  'Secteur 43': [12.3900, -1.4980],
  'Secteur 44': [12.3960, -1.4960],
  'Secteur 45': [12.3960, -1.4920],
  // Arrondissement 11
  'Secteur 46': [12.3450, -1.5400],
  'Secteur 47': [12.3300, -1.5400],
  'Secteur 48': [12.3350, -1.5480],
  'Secteur 49': [12.3420, -1.5580],
  'Secteur 50': [12.3380, -1.5520],
  'Secteur 51': [12.3400, -1.5450],
  // Arrondissement 12
  'Secteur 52': [12.3430, -1.5330],
  'Secteur 53': [12.3380, -1.5380],
  'Secteur 54': [12.3320, -1.5280],
  'Secteur 55': [12.3280, -1.5220],
};

// ─── Quartiers de Ouagadougou ─────────────────────────────────────────────────

export const OUAGA_COORDS: Record<string, [number, number]> = {
  'Bilbalogho':         [12.3742, -1.5218],
  'Saint Léon':         [12.3700, -1.5260],
  'Oscar Yaar':         [12.3730, -1.5240],
  'Zone Commerciale':   [12.3680, -1.5240],
  'Dapoya':             [12.3630, -1.5190],
  'Koulouba':           [12.3660, -1.5280],
  'Kamsonghin':         [12.3620, -1.5150],
  'Zone ZACA':          [12.3660, -1.5200],
  'Zangouettin':        [12.3660, -1.5260],
  'Samadin':            [12.3580, -1.5120],
  'Mankoudougou':       [12.3650, -1.5180],
  'Goughin':            [12.3700, -1.5435],
  'Gandin':             [12.3660, -1.5430],
  'Baoghin':            [12.3750, -1.5440],
  'Hamdalaye':          [12.3730, -1.5420],
  'Larlé':              [12.3720, -1.5400],
  'Kolog-Naba':         [12.3680, -1.5460],
  'Ouidi':              [12.3690, -1.5480],
  'Paspanga':           [12.3750, -1.5490],
  'Sankariaré':         [12.3760, -1.5470],
  "Cité An II":         [12.3720, -1.5460],
  "Cité An III":        [12.3755, -1.5485],
  'Niogsin':            [12.3740, -1.5475],
  'Dapoya II':          [12.3625, -1.5220],
  'Nemnin':             [12.3615, -1.5225],
  'Camp militaire':     [12.3580, -1.5280],
  'Yaoghin':            [12.3550, -1.5150],
  'Zongho':             [12.3540, -1.5155],
  'Noncin':             [12.3500, -1.5200],
  'Rimkiéta':           [12.3495, -1.5205],
  'Toécin':             [12.3455, -1.5150],
  'Kilwin':             [12.3445, -1.5155],
  'Tampouy':            [12.3955, -1.5480],
  'Koulweoghin':        [12.3920, -1.5410],
  'Tanghin':            [12.3850, -1.5600],
  'Somgandé':           [12.4000, -1.5320],
  'Sogdin':             [12.3850, -1.5200],
  'Polesgo':            [12.3840, -1.5210],
  'Tabtenga':           [12.3865, -1.5195],
  'Wayalghin':          [12.3820, -1.5160],
  'Zogona':             [12.3720, -1.5350],
  '1200 Logement':      [12.3780, -1.5100],
  'Dagnoin':            [12.3700, -1.4980],
  'Wemtenga':           [12.3780, -1.5040],
  'Silmissin':          [12.3510, -1.5460],
  'SIAO':               [12.3500, -1.5430],
  'Pagalayiri':         [12.3520, -1.5580],
  'Cissin':             [12.3480, -1.5480],
  'Pissy':              [12.3500, -1.5550],
  'Bongnaam':           [12.3560, -1.5620],
  'Song-Naaba':         [12.3580, -1.5580],
  'Nagrin':             [12.3450, -1.5350],
  'Bonheur-Ville':      [12.3430, -1.5195],
  'Sandogo':            [12.3400, -1.5300],
  'Boassa':             [12.3395, -1.5305],
  'Kankamsin':          [12.3405, -1.5295],
  'Darsalam':           [12.3400, -1.5150],
  'Nabitenga':          [12.3410, -1.5140],
  'Nonghin':            [12.3400, -1.5085],
  'Bassinko':           [12.3405, -1.5075],
  'Bissighin':          [12.3380, -1.5000],
  'Silmiougou':         [12.3375, -1.4995],
  'Marcoussis':         [12.3600, -1.4950],
  'Yagma':              [12.3590, -1.4940],
  'Kamboincé':          [12.3550, -1.4900],
  'Zoodnoma':           [12.3545, -1.4895],
  'Kamboissin':         [12.3600, -1.4830],
  'Kossodo':            [12.4130, -1.4990],
  'Nioko II':           [12.4125, -1.4985],
  'Nioko I':            [12.4050, -1.4955],
  'Dassasgho':          [12.3900, -1.4980],
  'Goundrin':           [12.3895, -1.4975],
  'Karpala':            [12.3400, -1.5450],
  'Sanyiri':            [12.3405, -1.5445],
  'Balkuy':             [12.3420, -1.5580],
  'Rayongo':            [12.3300, -1.5400],
  'Yamtenga':           [12.3295, -1.5405],
  'Patte d\'Oie':       [12.3430, -1.5330],
  'Ouaga 2000':         [12.3320, -1.5280],
  'Kossyam':            [12.3280, -1.5220],
};

// ─── Résolution multi-niveaux ────────────────────────────────────────────────

/**
 * Cherche les coordonnées dans l'ordre : quartier → secteur → arrondissement → ville.
 * Retourne null si introuvable.
 */
export function resolveCoords(name: string): [number, number] | null {
  return (
    OUAGA_COORDS[name]       ??
    OUAGA_SECTOR_COORDS[name] ??
    OUAGA_ARR_COORDS[name]   ??
    BF_CITY_COORDS[name]     ??
    null
  );
}
