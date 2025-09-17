import { Country, City, Arrondissement, Sector, Quartier } from '../models/countries-org.model';

// Mock Countries
export const MOCK_COUNTRIES: Country[] = [
    {
        id: '1',
        name: 'Burkina Faso',
        code: 'BF'
    },
    {
        id: '2',
        name: 'Mali',
        code: 'ML'
    },
    {
        id: '3',
        name: 'Niger',
        code: 'NE'
    },
    {
        id: '4',
        name: 'Côte d\'Ivoire',
        code: 'CI'
    },
    {
        id: '5',
        name: 'Ghana',
        code: 'GH'
    }
];

// Mock Cities
export const MOCK_CITIES: City[] = [
    // Burkina Faso Cities
    {
        id: '1',
        name: 'Ouagadougou',
        code: 'OUA',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '2',
        name: 'Bobo-Dioulasso',
        code: 'BOB',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '3',
        name: 'Koudougou',
        code: 'KOU',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '4',
        name: 'Banfora',
        code: 'BAN',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '13',
        name: 'Fada N\'Gourma',
        code: 'FAD',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '14',
        name: 'Ouahigouya',
        code: 'OUH',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '15',
        name: 'Tenkodogo',
        code: 'TEN',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '16',
        name: 'Dédougou',
        code: 'DED',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '17',
        name: 'Gaoua',
        code: 'GAO',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '18',
        name: 'Pô',
        code: 'PO',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '19',
        name: 'Ziniaré',
        code: 'ZIN',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '20',
        name: 'Manga',
        code: 'MAN',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '21',
        name: 'Kaya',
        code: 'KAY',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '22',
        name: 'Yako',
        code: 'YAK',
        country: MOCK_COUNTRIES[0]
    },
    {
        id: '23',
        name: 'Zorgho',
        code: 'ZOR',
        country: MOCK_COUNTRIES[0]
    },
    // Mali Cities
    {
        id: '5',
        name: 'Bamako',
        code: 'BAM',
        country: MOCK_COUNTRIES[1]
    },
    {
        id: '6',
        name: 'Sikasso',
        code: 'SIK',
        country: MOCK_COUNTRIES[1]
    },
    // Niger Cities
    {
        id: '7',
        name: 'Niamey',
        code: 'NIA',
        country: MOCK_COUNTRIES[2]
    },
    {
        id: '8',
        name: 'Zinder',
        code: 'ZIN',
        country: MOCK_COUNTRIES[2]
    },
    // Côte d'Ivoire Cities
    {
        id: '9',
        name: 'Abidjan',
        code: 'ABI',
        country: MOCK_COUNTRIES[3]
    },
    {
        id: '10',
        name: 'Yamoussoukro',
        code: 'YAM',
        country: MOCK_COUNTRIES[3]
    },
    // Ghana Cities
    {
        id: '11',
        name: 'Accra',
        code: 'ACC',
        country: MOCK_COUNTRIES[4]
    },
    {
        id: '12',
        name: 'Kumasi',
        code: 'KUM',
        country: MOCK_COUNTRIES[4]
    }
];

// Mock Arrondissements
export const MOCK_ARRONDISSEMENTS: Arrondissement[] = [

    // Ouagadougou Arrondissements
    { id: '1', name: 'Arrondissement 1', code: 'ARR1', city: MOCK_CITIES[0] },
    { id: '2', name: 'Arrondissement 2', code: 'ARR2', city: MOCK_CITIES[0] },
    { id: '3', name: 'Arrondissement 3', code: 'ARR3', city: MOCK_CITIES[0] },
    { id: '4', name: 'Arrondissement 4', code: 'ARR4', city: MOCK_CITIES[0] },
    { id: '5', name: 'Arrondissement 5', code: 'ARR5', city: MOCK_CITIES[0] },
    { id: '6', name: 'Arrondissement 6', code: 'ARR6', city: MOCK_CITIES[0] },
    { id: '7', name: 'Arrondissement 7', code: 'ARR7', city: MOCK_CITIES[0] },
    { id: '8', name: 'Arrondissement 8', code: 'ARR8', city: MOCK_CITIES[0] },
    { id: '9', name: 'Arrondissement 9', code: 'ARR9', city: MOCK_CITIES[0] },
    { id: '10', name: 'Arrondissement 10', code: 'ARR10', city: MOCK_CITIES[0] },
    { id: '11', name: 'Arrondissement 11', code: 'ARR11', city: MOCK_CITIES[0] },
    { id: '12', name: 'Arrondissement 12', code: 'ARR12', city: MOCK_CITIES[0] },



    // { id: '1', name: 'Baskuy', code: 'BAS', city: MOCK_CITIES[0] },
    // { id: '2', name: 'Bogodogo', code: 'BOG', city: MOCK_CITIES[0] },
    // { id: '3', name: 'Boulmiougou', code: 'BOU', city: MOCK_CITIES[0] },
    // { id: '4', name: 'Nongremassom', code: 'NON', city: MOCK_CITIES[0] },
    // { id: '5', name: 'Sig-Noghin', code: 'SIG', city: MOCK_CITIES[0] },

    // Bobo-Dioulasso Arrondissements
    { id: '6', name: 'Do', code: 'DO', city: MOCK_CITIES[1] },
    { id: '7', name: 'Dafra', code: 'DAF', city: MOCK_CITIES[1] },
    { id: '8', name: 'Konsa', code: 'KON', city: MOCK_CITIES[1] },
    { id: '24', name: 'Tounouma', code: 'TOU', city: MOCK_CITIES[1] },
    { id: '25', name: 'Colma', code: 'COL', city: MOCK_CITIES[1] },

    // Koudougou Arrondissements
    { id: '26', name: 'Sector 1', code: 'S1KOU', city: MOCK_CITIES[2] },
    { id: '27', name: 'Sector 2', code: 'S2KOU', city: MOCK_CITIES[2] },
    { id: '28', name: 'Sector 3', code: 'S3KOU', city: MOCK_CITIES[2] },
    { id: '29', name: 'Sector 4', code: 'S4KOU', city: MOCK_CITIES[2] },
    { id: '30', name: 'Sector 5', code: 'S5KOU', city: MOCK_CITIES[2] },

    // Banfora Arrondissements
    { id: '31', name: 'Sector 1', code: 'S1BAN', city: MOCK_CITIES[3] },
    { id: '32', name: 'Sector 2', code: 'S2BAN', city: MOCK_CITIES[3] },
    { id: '33', name: 'Sector 3', code: 'S3BAN', city: MOCK_CITIES[3] },
    { id: '34', name: 'Sector 4', code: 'S4BAN', city: MOCK_CITIES[3] },
    { id: '35', name: 'Sector 5', code: 'S5BAN', city: MOCK_CITIES[3] },

    // Fada N'Gourma Arrondissements
    { id: '36', name: 'Sector 1', code: 'S1FAD', city: MOCK_CITIES[4] },
    { id: '37', name: 'Sector 2', code: 'S2FAD', city: MOCK_CITIES[4] },
    { id: '38', name: 'Sector 3', code: 'S3FAD', city: MOCK_CITIES[4] },
    { id: '39', name: 'Sector 4', code: 'S4FAD', city: MOCK_CITIES[4] },
    { id: '40', name: 'Sector 5', code: 'S5FAD', city: MOCK_CITIES[4] },

    // Ouahigouya Arrondissements
    { id: '41', name: 'Sector 1', code: 'S1OUH', city: MOCK_CITIES[5] },
    { id: '42', name: 'Sector 2', code: 'S2OUH', city: MOCK_CITIES[5] },
    { id: '43', name: 'Sector 3', code: 'S3OUH', city: MOCK_CITIES[5] },
    { id: '44', name: 'Sector 4', code: 'S4OUH', city: MOCK_CITIES[5] },
    { id: '45', name: 'Sector 5', code: 'S5OUH', city: MOCK_CITIES[5] },

    // Tenkodogo Arrondissements
    { id: '46', name: 'Sector 1', code: 'S1TEN', city: MOCK_CITIES[6] },
    { id: '47', name: 'Sector 2', code: 'S2TEN', city: MOCK_CITIES[6] },
    { id: '48', name: 'Sector 3', code: 'S3TEN', city: MOCK_CITIES[6] },
    { id: '49', name: 'Sector 4', code: 'S4TEN', city: MOCK_CITIES[6] },
    { id: '50', name: 'Sector 5', code: 'S5TEN', city: MOCK_CITIES[6] },

    // Dédougou Arrondissements
    { id: '51', name: 'Sector 1', code: 'S1DED', city: MOCK_CITIES[7] },
    { id: '52', name: 'Sector 2', code: 'S2DED', city: MOCK_CITIES[7] },
    { id: '53', name: 'Sector 3', code: 'S3DED', city: MOCK_CITIES[7] },
    { id: '54', name: 'Sector 4', code: 'S4DED', city: MOCK_CITIES[7] },
    { id: '55', name: 'Sector 5', code: 'S5DED', city: MOCK_CITIES[7] },

    // Gaoua Arrondissements
    { id: '56', name: 'Sector 1', code: 'S1GAO', city: MOCK_CITIES[8] },
    { id: '57', name: 'Sector 2', code: 'S2GAO', city: MOCK_CITIES[8] },
    { id: '58', name: 'Sector 3', code: 'S3GAO', city: MOCK_CITIES[8] },
    { id: '59', name: 'Sector 4', code: 'S4GAO', city: MOCK_CITIES[8] },
    { id: '60', name: 'Sector 5', code: 'S5GAO', city: MOCK_CITIES[8] },

    // Pô Arrondissements
    { id: '61', name: 'Sector 1', code: 'S1PO', city: MOCK_CITIES[9] },
    { id: '62', name: 'Sector 2', code: 'S2PO', city: MOCK_CITIES[9] },
    { id: '63', name: 'Sector 3', code: 'S3PO', city: MOCK_CITIES[9] },
    { id: '64', name: 'Sector 4', code: 'S4PO', city: MOCK_CITIES[9] },
    { id: '65', name: 'Sector 5', code: 'S5PO', city: MOCK_CITIES[9] },

    // Ziniaré Arrondissements
    { id: '66', name: 'Sector 1', code: 'S1ZIN', city: MOCK_CITIES[10] },
    { id: '67', name: 'Sector 2', code: 'S2ZIN', city: MOCK_CITIES[10] },
    { id: '68', name: 'Sector 3', code: 'S3ZIN', city: MOCK_CITIES[10] },
    { id: '69', name: 'Sector 4', code: 'S4ZIN', city: MOCK_CITIES[10] },
    { id: '70', name: 'Sector 5', code: 'S5ZIN', city: MOCK_CITIES[10] },

    // Manga Arrondissements
    { id: '71', name: 'Sector 1', code: 'S1MAN', city: MOCK_CITIES[11] },
    { id: '72', name: 'Sector 2', code: 'S2MAN', city: MOCK_CITIES[11] },
    { id: '73', name: 'Sector 3', code: 'S3MAN', city: MOCK_CITIES[11] },
    { id: '74', name: 'Sector 4', code: 'S4MAN', city: MOCK_CITIES[11] },
    { id: '75', name: 'Sector 5', code: 'S5MAN', city: MOCK_CITIES[11] },

    // Kaya Arrondissements
    { id: '76', name: 'Sector 1', code: 'S1KAY', city: MOCK_CITIES[12] },
    { id: '77', name: 'Sector 2', code: 'S2KAY', city: MOCK_CITIES[12] },
    { id: '78', name: 'Sector 3', code: 'S3KAY', city: MOCK_CITIES[12] },
    { id: '79', name: 'Sector 4', code: 'S4KAY', city: MOCK_CITIES[12] },
    { id: '80', name: 'Sector 5', code: 'S5KAY', city: MOCK_CITIES[12] },

    // Yako Arrondissements
    { id: '81', name: 'Sector 1', code: 'S1YAK', city: MOCK_CITIES[13] },
    { id: '82', name: 'Sector 2', code: 'S2YAK', city: MOCK_CITIES[13] },
    { id: '83', name: 'Sector 3', code: 'S3YAK', city: MOCK_CITIES[13] },
    { id: '84', name: 'Sector 4', code: 'S4YAK', city: MOCK_CITIES[13] },
    { id: '85', name: 'Sector 5', code: 'S5YAK', city: MOCK_CITIES[13] },

    // Zorgho Arrondissements
    { id: '86', name: 'Sector 1', code: 'S1ZOR', city: MOCK_CITIES[14] },
    { id: '87', name: 'Sector 2', code: 'S2ZOR', city: MOCK_CITIES[14] },
    { id: '88', name: 'Sector 3', code: 'S3ZOR', city: MOCK_CITIES[14] },
    { id: '89', name: 'Sector 4', code: 'S4ZOR', city: MOCK_CITIES[14] },
    { id: '90', name: 'Sector 5', code: 'S5ZOR', city: MOCK_CITIES[14] },

    // ...existing arrondissements for other countries...
    // Mali Cities
    { id: '91', name: 'Commune I', code: 'COM1', city: MOCK_CITIES[15] },
    { id: '92', name: 'Commune II', code: 'COM2', city: MOCK_CITIES[15] },
    { id: '93', name: 'Commune III', code: 'COM3', city: MOCK_CITIES[15] },
    // ...etc...
];

// Mock Sectors
export const MOCK_SECTORS: Sector[] = [
  // Arrondissement 1
  { id: '1', name: 'Secteur 1', code: 'S01', arrondissement: MOCK_ARRONDISSEMENTS[0] },
  { id: '2', name: 'Secteur 2', code: 'S02', arrondissement: MOCK_ARRONDISSEMENTS[0] },
  { id: '3', name: 'Secteur 3', code: 'S03', arrondissement: MOCK_ARRONDISSEMENTS[0] },
  { id: '4', name: 'Secteur 4', code: 'S04', arrondissement: MOCK_ARRONDISSEMENTS[0] },
  { id: '5', name: 'Secteur 5', code: 'S05', arrondissement: MOCK_ARRONDISSEMENTS[0] },

  // Arrondissement 2
  { id: '6', name: 'Secteur 6', code: 'S06', arrondissement: MOCK_ARRONDISSEMENTS[1] },
  { id: '7', name: 'Secteur 7', code: 'S07', arrondissement: MOCK_ARRONDISSEMENTS[1] },
  { id: '8', name: 'Secteur 8', code: 'S08', arrondissement: MOCK_ARRONDISSEMENTS[1] },
  { id: '9', name: 'Secteur 9', code: 'S09', arrondissement: MOCK_ARRONDISSEMENTS[1] },
  { id: '10', name: 'Secteur 10', code: 'S10', arrondissement: MOCK_ARRONDISSEMENTS[1] },

  // Arrondissement 3
  { id: '11', name: 'Secteur 11', code: 'S11', arrondissement: MOCK_ARRONDISSEMENTS[2] },
  { id: '12', name: 'Secteur 12', code: 'S12', arrondissement: MOCK_ARRONDISSEMENTS[2] },
  { id: '13', name: 'Secteur 13', code: 'S13', arrondissement: MOCK_ARRONDISSEMENTS[2] },
  { id: '14', name: 'Secteur 14', code: 'S14', arrondissement: MOCK_ARRONDISSEMENTS[2] },
  { id: '15', name: 'Secteur 15', code: 'S15', arrondissement: MOCK_ARRONDISSEMENTS[2] },

  // Arrondissement 4
  { id: '16', name: 'Secteur 16', code: 'S16', arrondissement: MOCK_ARRONDISSEMENTS[3] },
  { id: '17', name: 'Secteur 17', code: 'S17', arrondissement: MOCK_ARRONDISSEMENTS[3] },
  { id: '18', name: 'Secteur 18', code: 'S18', arrondissement: MOCK_ARRONDISSEMENTS[3] },
  { id: '19', name: 'Secteur 19', code: 'S19', arrondissement: MOCK_ARRONDISSEMENTS[3] },

  // Arrondissement 5
  { id: '20', name: 'Secteur 20', code: 'S20', arrondissement: MOCK_ARRONDISSEMENTS[4] },
  { id: '21', name: 'Secteur 21', code: 'S21', arrondissement: MOCK_ARRONDISSEMENTS[4] },
  { id: '22', name: 'Secteur 22', code: 'S22', arrondissement: MOCK_ARRONDISSEMENTS[4] },
  { id: '23', name: 'Secteur 23', code: 'S23', arrondissement: MOCK_ARRONDISSEMENTS[4] },

  // Arrondissement 6
  { id: '24', name: 'Secteur 24', code: 'S24', arrondissement: MOCK_ARRONDISSEMENTS[5] },
  { id: '25', name: 'Secteur 25', code: 'S25', arrondissement: MOCK_ARRONDISSEMENTS[5] },
  { id: '26', name: 'Secteur 26', code: 'S26', arrondissement: MOCK_ARRONDISSEMENTS[5] },
  { id: '27', name: 'Secteur 27', code: 'S27', arrondissement: MOCK_ARRONDISSEMENTS[5] },
  { id: '28', name: 'Secteur 28', code: 'S28', arrondissement: MOCK_ARRONDISSEMENTS[5] },
  { id: '29', name: 'Secteur 29', code: 'S29', arrondissement: MOCK_ARRONDISSEMENTS[5] },

  // Arrondissement 7
  { id: '30', name: 'Secteur 30', code: 'S30', arrondissement: MOCK_ARRONDISSEMENTS[6] },
  { id: '31', name: 'Secteur 31', code: 'S31', arrondissement: MOCK_ARRONDISSEMENTS[6] },
  { id: '32', name: 'Secteur 32', code: 'S32', arrondissement: MOCK_ARRONDISSEMENTS[6] },
  { id: '33', name: 'Secteur 33', code: 'S33', arrondissement: MOCK_ARRONDISSEMENTS[6] },

  // Arrondissement 8
  { id: '34', name: 'Secteur 34', code: 'S34', arrondissement: MOCK_ARRONDISSEMENTS[7] },
  { id: '35', name: 'Secteur 35', code: 'S35', arrondissement: MOCK_ARRONDISSEMENTS[7] },
  { id: '36', name: 'Secteur 36', code: 'S36', arrondissement: MOCK_ARRONDISSEMENTS[7] },

  // Arrondissement 9
  { id: '37', name: 'Secteur 37', code: 'S37', arrondissement: MOCK_ARRONDISSEMENTS[8] },
  { id: '38', name: 'Secteur 38', code: 'S38', arrondissement: MOCK_ARRONDISSEMENTS[8] },
  { id: '39', name: 'Secteur 39', code: 'S39', arrondissement: MOCK_ARRONDISSEMENTS[8] },
  { id: '40', name: 'Secteur 40', code: 'S40', arrondissement: MOCK_ARRONDISSEMENTS[8] },

  // Arrondissement 10
  { id: '41', name: 'Secteur 41', code: 'S41', arrondissement: MOCK_ARRONDISSEMENTS[9] },
  { id: '42', name: 'Secteur 42', code: 'S42', arrondissement: MOCK_ARRONDISSEMENTS[9] },
  { id: '43', name: 'Secteur 43', code: 'S43', arrondissement: MOCK_ARRONDISSEMENTS[9] },
  { id: '44', name: 'Secteur 44', code: 'S44', arrondissement: MOCK_ARRONDISSEMENTS[9] },
  { id: '45', name: 'Secteur 45', code: 'S45', arrondissement: MOCK_ARRONDISSEMENTS[9] },

  // Arrondissement 11
  { id: '46', name: 'Secteur 46', code: 'S46', arrondissement: MOCK_ARRONDISSEMENTS[10] },
  { id: '47', name: 'Secteur 47', code: 'S47', arrondissement: MOCK_ARRONDISSEMENTS[10] },
  { id: '48', name: 'Secteur 48', code: 'S48', arrondissement: MOCK_ARRONDISSEMENTS[10] },
  { id: '49', name: 'Secteur 49', code: 'S49', arrondissement: MOCK_ARRONDISSEMENTS[10] },
  { id: '50', name: 'Secteur 50', code: 'S50', arrondissement: MOCK_ARRONDISSEMENTS[10] },
  { id: '51', name: 'Secteur 51', code: 'S51', arrondissement: MOCK_ARRONDISSEMENTS[10] },

  // Arrondissement 12
  { id: '52', name: 'Secteur 52', code: 'S52', arrondissement: MOCK_ARRONDISSEMENTS[11] },
  { id: '53', name: 'Secteur 53', code: 'S53', arrondissement: MOCK_ARRONDISSEMENTS[11] },
  { id: '54', name: 'Secteur 54', code: 'S54', arrondissement: MOCK_ARRONDISSEMENTS[11] },
  { id: '55', name: 'Secteur 55', code: 'S55', arrondissement: MOCK_ARRONDISSEMENTS[11] }
];

// Mock Quartiers
export const MOCK_QUARTIERS: Quartier[] = [
  // Arrondissement 1
  { id: '1', name: 'Bilbalogo', code: 'Q01', sector: MOCK_SECTORS[0] },
  { id: '2', name: 'Saint Léon', code: 'Q02', sector: MOCK_SECTORS[1] },
  { id: '3', name: 'Oscar Yaar', code: 'Q03', sector: MOCK_SECTORS[1] },
  { id: '4', name: 'Zone Commerciale', code: 'Q04', sector: MOCK_SECTORS[1] },
  { id: '5', name: 'Dapoya1', code: 'Q05', sector: MOCK_SECTORS[1] },
  { id: '6', name: 'Quartiers Saints', code: 'Q06', sector: MOCK_SECTORS[1] },
  { id: '7', name: 'Koulouba', code: 'Q07', sector: MOCK_SECTORS[2] },
  { id: '8', name: 'Rotonde', code: 'Q08', sector: MOCK_SECTORS[2] },
  { id: '9', name: 'Université de Ouagadougou', code: 'Q09', sector: MOCK_SECTORS[2] },
  { id: '10', name: 'Zone Ministères et Ambassades', code: 'Q10', sector: MOCK_SECTORS[2] },
  { id: '11', name: 'Kamsonghin', code: 'Q11', sector: MOCK_SECTORS[3] },
  { id: '12', name: 'Cité An II', code: 'Q12', sector: MOCK_SECTORS[3] },
  { id: '13', name: 'Zone ZACA (Aéroport)', code: 'Q13', sector: MOCK_SECTORS[3] },
  { id: '14', name: 'Boince Yaar', code: 'Q14', sector: MOCK_SECTORS[3] },
  { id: '15', name: 'Zangouettin', code: 'Q15', sector: MOCK_SECTORS[3] },
  { id: '16', name: 'Samadin', code: 'Q16', sector: MOCK_SECTORS[4] },
  { id: '17', name: 'Kouritenga', code: 'Q17', sector: MOCK_SECTORS[4] },
  { id: '18', name: 'Mankoudougou', code: 'Q18', sector: MOCK_SECTORS[4] },

  // Arrondissement 2
  { id: '19', name: 'Goughin sud', code: 'Q19', sector: MOCK_SECTORS[5] },
  { id: '20', name: 'Gandin (Petit Paris)', code: 'Q20', sector: MOCK_SECTORS[5] },
  { id: '21', name: 'Goughin nord', code: 'Q21', sector: MOCK_SECTORS[6] },
  { id: '22', name: 'Baoghin', code: 'Q22', sector: MOCK_SECTORS[6] },
  { id: '23', name: 'Hamdalaye', code: 'Q23', sector: MOCK_SECTORS[7] },
  { id: '24', name: 'Larlé', code: 'Q24', sector: MOCK_SECTORS[7] },
  { id: '25', name: 'Marché du 10', code: 'Q25', sector: MOCK_SECTORS[7] },
  { id: '26', name: 'Baskuy Yaar', code: 'Q26', sector: MOCK_SECTORS[8] },
  { id: '27', name: 'Kolog-Naba', code: 'Q27', sector: MOCK_SECTORS[8] },
  { id: '28', name: 'Ouidi', code: 'Q28', sector: MOCK_SECTORS[8] },
  { id: '29', name: 'Cité An III', code: 'Q29', sector: MOCK_SECTORS[9] },
  { id: '30', name: 'Sankariaré', code: 'Q30', sector: MOCK_SECTORS[9] },
  { id: '31', name: 'Paspanga', code: 'Q31', sector: MOCK_SECTORS[9] },
  { id: '32', name: 'Niogsin', code: 'Q32', sector: MOCK_SECTORS[9] },

  // Arrondissement 3
  { id: '33', name: 'Dapoya II', code: 'Q33', sector: MOCK_SECTORS[10] },
  { id: '34', name: 'Nemnin', code: 'Q34', sector: MOCK_SECTORS[10] },
  { id: '35', name: 'Camp militaire', code: 'Q35', sector: MOCK_SECTORS[11] },
  { id: '36', name: 'Naab Pougo', code: 'Q36', sector: MOCK_SECTORS[11] },
  { id: '37', name: 'Yaoghin', code: 'Q37', sector: MOCK_SECTORS[12] },
  { id: '38', name: 'Zongho', code: 'Q38', sector: MOCK_SECTORS[12] },
  { id: '39', name: 'Noncin', code: 'Q39', sector: MOCK_SECTORS[13] },
  { id: '40', name: 'Rimkiéta', code: 'Q40', sector: MOCK_SECTORS[13] },
  { id: '41', name: 'Toécin', code: 'Q41', sector: MOCK_SECTORS[14] },
  { id: '42', name: 'Kilwin', code: 'Q42', sector: MOCK_SECTORS[14] },

  // Arrondissement 4
  { id: '43', name: 'Tampouy', code: 'Q43', sector: MOCK_SECTORS[15] },
  { id: '44', name: 'Koulweoghin', code: 'Q44', sector: MOCK_SECTORS[16] },
  { id: '45', name: 'Tanghin', code: 'Q45', sector: MOCK_SECTORS[16] },
  { id: '46', name: 'Somgandé', code: 'Q46', sector: MOCK_SECTORS[17] },
  { id: '47', name: 'Sambin barrage', code: 'Q47', sector: MOCK_SECTORS[17] },
  { id: '48', name: 'Zone industrielle Kossodo', code: 'Q48', sector: MOCK_SECTORS[18] },
  { id: '49', name: 'Toudoubwéogo', code: 'Q49', sector: MOCK_SECTORS[18] },

  // Arrondissement 5
  { id: '50', name: 'Sogdin', code: 'Q50', sector: MOCK_SECTORS[19] },
  { id: '51', name: 'Polesgo', code: 'Q51', sector: MOCK_SECTORS[19] },
  { id: '52', name: 'Tabtenga', code: 'Q52', sector: MOCK_SECTORS[19] },
  { id: '53', name: 'ENAREF Cogeb', code: 'Q53', sector: MOCK_SECTORS[20] },
  { id: '54', name: 'Wayalghin', code: 'Q54', sector: MOCK_SECTORS[20] },
  { id: '55', name: 'Zone du Bois', code: 'Q55', sector: MOCK_SECTORS[21] },
  { id: '56', name: 'Zogona', code: 'Q56', sector: MOCK_SECTORS[21] },
  { id: '57', name: '1200 Logement', code: 'Q57', sector: MOCK_SECTORS[22] },
  { id: '58', name: 'Dagnoin', code: 'Q58', sector: MOCK_SECTORS[22] },
  { id: '59', name: 'Wemtenga', code: 'Q59', sector: MOCK_SECTORS[22] },

  // Arrondissement 6
  { id: '60', name: 'Ronsin (1200 logements)', code: 'Q60', sector: MOCK_SECTORS[23] },
  { id: '61', name: 'Kalgodin', code: 'Q61', sector: MOCK_SECTORS[23] },
  { id: '62', name: 'Ouaga Inter', code: 'Q62', sector: MOCK_SECTORS[23] },
  { id: '63', name: 'SIAO', code: 'Q63', sector: MOCK_SECTORS[23] },
  { id: '64', name: 'Silmissin', code: 'Q64', sector: MOCK_SECTORS[23] },
  { id: '65', name: 'Toeyibin', code: 'Q65', sector: MOCK_SECTORS[23] },
  { id: '66', name: 'Pagalayiri', code: 'Q66', sector: MOCK_SECTORS[24] },
  { id: '67', name: 'Cissin', code: 'Q67', sector: MOCK_SECTORS[25] },
  { id: '68', name: 'Pissy', code: 'Q68', sector: MOCK_SECTORS[25] },
  { id: '69', name: 'Bongnaam', code: 'Q69', sector: MOCK_SECTORS[26] },
  { id: '70', name: 'Kouritenga', code: 'Q70', sector: MOCK_SECTORS[27] },
  { id: '71', name: 'Sonré', code: 'Q71', sector: MOCK_SECTORS[27] },
  { id: '72', name: 'Song-Naaba', code: 'Q72', sector: MOCK_SECTORS[28] },
  { id: '73', name: 'Azimo/Socogib', code: 'Q73', sector: MOCK_SECTORS[28] },

  // Arrondissement 7
  { id: '74', name: 'Nagrin', code: 'Q74', sector: MOCK_SECTORS[29] },
  { id: '75', name: 'Yaoghin', code: 'Q75', sector: MOCK_SECTORS[30] },
  { id: '76', name: 'Bonheur-Ville', code: 'Q76', sector: MOCK_SECTORS[30] },
  { id: '77', name: 'Waa-Paasi', code: 'Q77', sector: MOCK_SECTORS[30] },
  { id: '78', name: 'Belle-Ville', code: 'Q78', sector: MOCK_SECTORS[30] },
  { id: '79', name: 'Sandogo', code: 'Q79', sector: MOCK_SECTORS[31] },
  { id: '80', name: 'Boassa', code: 'Q80', sector: MOCK_SECTORS[31] },
  { id: '81', name: 'Kankamsin', code: 'Q81', sector: MOCK_SECTORS[31] },
  { id: '82', name: 'Zagtouli sud', code: 'Q82', sector: MOCK_SECTORS[32] },

  // Arrondissement 8
  { id: '83', name: 'Zagtouli nord', code: 'Q83', sector: MOCK_SECTORS[33] },
  { id: '84', name: 'Darsalam', code: 'Q84', sector: MOCK_SECTORS[33] },
  { id: '85', name: 'Zongo', code: 'Q85', sector: MOCK_SECTORS[33] },
  { id: '86', name: 'Nabitenga', code: 'Q86', sector: MOCK_SECTORS[33] },
  { id: '87', name: 'Nonghin', code: 'Q87', sector: MOCK_SECTORS[34] },
  { id: '88', name: 'Bassinko/Basseko', code: 'Q88', sector: MOCK_SECTORS[34] },
  { id: '89', name: 'Sogpelcé', code: 'Q89', sector: MOCK_SECTORS[34] },
  { id: '90', name: 'Bissighin', code: 'Q90', sector: MOCK_SECTORS[35] },
  { id: '91', name: 'Silmiougou', code: 'Q91', sector: MOCK_SECTORS[35] },
  { id: '92', name: 'Gantin', code: 'Q92', sector: MOCK_SECTORS[35] },
  { id: '93', name: 'Silmiyiri', code: 'Q93', sector: MOCK_SECTORS[35] },

  // Arrondissement 9
  { id: '94', name: 'Marcoussis', code: 'Q94', sector: MOCK_SECTORS[36] },
  { id: '95', name: 'Bissighin', code: 'Q95', sector: MOCK_SECTORS[36] },
  { id: '96', name: 'Yagma', code: 'Q96', sector: MOCK_SECTORS[36] },
  { id: '97', name: 'Ouapassi', code: 'Q97', sector: MOCK_SECTORS[37] },
  { id: '98', name: 'Kamboincé', code: 'Q98', sector: MOCK_SECTORS[37] },
  { id: '99', name: 'Zoodnoma', code: 'Q99', sector: MOCK_SECTORS[37] },
  { id: '100', name: 'Watinonma', code: 'Q100', sector: MOCK_SECTORS[37] },
  { id: '101', name: 'Kossoghin', code: 'Q101', sector: MOCK_SECTORS[37] },
  { id: '102', name: 'Silmiyiri', code: 'Q102', sector: MOCK_SECTORS[37] },
  { id: '103', name: 'Bangpooré', code: 'Q103', sector: MOCK_SECTORS[38] },
  { id: '104', name: 'Wobriguéré', code: 'Q104', sector: MOCK_SECTORS[38] },
  { id: '105', name: 'Babouang Rouanga', code: 'Q105', sector: MOCK_SECTORS[38] },
  { id: '106', name: 'Toudweogo', code: 'Q106', sector: MOCK_SECTORS[38] },
  { id: '107', name: 'Kamboissin', code: 'Q107', sector: MOCK_SECTORS[39] },
  { id: '108', name: 'Dapaweoghin', code: 'Q108', sector: MOCK_SECTORS[39] },
  { id: '109', name: 'Toeghin', code: 'Q109', sector: MOCK_SECTORS[39] },
  { id: '110', name: 'Sakoula', code: 'Q110', sector: MOCK_SECTORS[39] },

  // Arrondissement 10
  { id: '111', name: 'Kossodo', code: 'Q111', sector: MOCK_SECTORS[40] },
  { id: '112', name: 'Nioko II', code: 'Q112', sector: MOCK_SECTORS[40] },
  { id: '113', name: 'Bendogo', code: 'Q113', sector: MOCK_SECTORS[41] },
  { id: '114', name: 'Wayalghin', code: 'Q114', sector: MOCK_SECTORS[41] },
  { id: '115', name: 'Nioko I', code: 'Q115', sector: MOCK_SECTORS[41] },
  { id: '116', name: 'Godin', code: 'Q116', sector: MOCK_SECTORS[41] },
  { id: '117', name: 'Dassasgho', code: 'Q117', sector: MOCK_SECTORS[42] },
  { id: '118', name: 'Goundrin', code: 'Q118', sector: MOCK_SECTORS[42] },
  { id: '119', name: 'Quatorze-Yaar', code: 'Q119', sector: MOCK_SECTORS[43] },
  { id: '120', name: 'Djikof', code: 'Q120', sector: MOCK_SECTORS[44] },
  { id: '121', name: 'Taabtenga', code: 'Q121', sector: MOCK_SECTORS[44] },

  // Arrondissement 11
  { id: '122', name: 'Zone une', code: 'Q122', sector: MOCK_SECTORS[45] },
  { id: '123', name: 'Katr-yaar', code: 'Q123', sector: MOCK_SECTORS[45] },
  { id: '124', name: 'Rayongo', code: 'Q124', sector: MOCK_SECTORS[46] },
  { id: '125', name: 'Yamtenga', code: 'Q125', sector: MOCK_SECTORS[46] },
  { id: '126', name: 'Ouidtenga', code: 'Q126', sector: MOCK_SECTORS[46] },
  { id: '127', name: 'Kaparla non loti/Dayongo', code: 'Q127', sector: MOCK_SECTORS[47] },
  { id: '128', name: 'Balkuy', code: 'Q128', sector: MOCK_SECTORS[48] },
  { id: '129', name: 'Lanoayiri', code: 'Q129', sector: MOCK_SECTORS[49] },
  { id: '130', name: 'Karpala', code: 'Q130', sector: MOCK_SECTORS[50] },
  { id: '131', name: 'Sanyiri', code: 'Q131', sector: MOCK_SECTORS[50] },

  // Arrondissement 12
  { id: '132', name: 'Patte d’Oie', code: 'Q132', sector: MOCK_SECTORS[51] },
  { id: '133', name: 'Trame d’Accueil', code: 'Q133', sector: MOCK_SECTORS[52] },
  { id: '134', name: 'Ouaga 2000 (Côté ambassade USA)', code: 'Q134', sector: MOCK_SECTORS[52] },
  { id: '135', name: 'Ouaga 2000', code: 'Q135', sector: MOCK_SECTORS[53] },
  { id: '136', name: 'Côté Libya hôtel', code: 'Q136', sector: MOCK_SECTORS[53] },
  { id: '137', name: 'Kossyam', code: 'Q137', sector: MOCK_SECTORS[54] }
];
