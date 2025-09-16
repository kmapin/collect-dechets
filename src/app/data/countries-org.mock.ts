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
    { id: '1', name: 'Baskuy', code: 'BAS', city: MOCK_CITIES[0] },
    { id: '2', name: 'Bogodogo', code: 'BOG', city: MOCK_CITIES[0] },
    { id: '3', name: 'Boulmiougou', code: 'BOU', city: MOCK_CITIES[0] },
    { id: '4', name: 'Nongremassom', code: 'NON', city: MOCK_CITIES[0] },
    { id: '5', name: 'Sig-Noghin', code: 'SIG', city: MOCK_CITIES[0] },

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
    // Baskuy Sectors
    {
        id: '1',
        name: 'Secteur 1',
        code: 'S01',
        arrondissement: MOCK_ARRONDISSEMENTS[0]
    },
    {
        id: '2',
        name: 'Secteur 2',
        code: 'S02',
        arrondissement: MOCK_ARRONDISSEMENTS[0]
    },
    {
        id: '3',
        name: 'Secteur 3',
        code: 'S03',
        arrondissement: MOCK_ARRONDISSEMENTS[0]
    },
    // Bogodogo Sectors
    {
        id: '4',
        name: 'Secteur 17',
        code: 'S17',
        arrondissement: MOCK_ARRONDISSEMENTS[1]
    },
    {
        id: '5',
        name: 'Secteur 18',
        code: 'S18',
        arrondissement: MOCK_ARRONDISSEMENTS[1]
    },
    {
        id: '6',
        name: 'Secteur 19',
        code: 'S19',
        arrondissement: MOCK_ARRONDISSEMENTS[1]
    },
    // Boulmiougou Sectors
    {
        id: '7',
        name: 'Secteur 11',
        code: 'S11',
        arrondissement: MOCK_ARRONDISSEMENTS[2]
    },
    {
        id: '8',
        name: 'Secteur 12',
        code: 'S12',
        arrondissement: MOCK_ARRONDISSEMENTS[2]
    },
    // Do Sectors (Bobo-Dioulasso)
    {
        id: '9',
        name: 'Secteur Dioulassoba',
        code: 'DIO',
        arrondissement: MOCK_ARRONDISSEMENTS[5]
    },
    {
        id: '10',
        name: 'Secteur Sarfalao',
        code: 'SAR',
        arrondissement: MOCK_ARRONDISSEMENTS[5]
    },
    // Plateau Sectors (Abidjan)
    {
        id: '11',
        name: 'Secteur Centre Ville',
        code: 'CEN',
        arrondissement: MOCK_ARRONDISSEMENTS[11]
    },
    {
        id: '12',
        name: 'Secteur Zone 4',
        code: 'Z04',
        arrondissement: MOCK_ARRONDISSEMENTS[11]
    }
];

// Mock Quartiers
export const MOCK_QUARTIERS: Quartier[] = [
    // Secteur 1 Quartiers
    {
        id: '1',
        name: 'Tampouy',
        code: 'TAM',
        sector: MOCK_SECTORS[0]
    },
    {
        id: '2',
        name: 'Somgandé',
        code: 'SOM',
        sector: MOCK_SECTORS[0]
    },
    {
        id: '3',
        name: 'Wayalghin',
        code: 'WAY',
        sector: MOCK_SECTORS[0]
    },
    // Secteur 2 Quartiers
    {
        id: '4',
        name: 'Cissin',
        code: 'CIS',
        sector: MOCK_SECTORS[1]
    },
    {
        id: '5',
        name: 'Rimkieta',
        code: 'RIM',
        sector: MOCK_SECTORS[1]
    },
    // Secteur 17 Quartiers
    {
        id: '6',
        name: 'Tanghin',
        code: 'TAN',
        sector: MOCK_SECTORS[3]
    },
    {
        id: '7',
        name: 'Samandin',
        code: 'SAM',
        sector: MOCK_SECTORS[3]
    },
    {
        id: '8',
        name: 'Nioko 2',
        code: 'NIO2',
        sector: MOCK_SECTORS[3]
    },
    // Secteur 11 Quartiers
    {
        id: '9',
        name: 'Dapoya',
        code: 'DAP',
        sector: MOCK_SECTORS[6]
    },
    {
        id: '10',
        name: 'Kamsonghin',
        code: 'KAM',
        sector: MOCK_SECTORS[6]
    },
    // Dioulassoba Quartiers (Bobo-Dioulasso)
    {
        id: '11',
        name: 'Dioulassoba Centre',
        code: 'DIC',
        sector: MOCK_SECTORS[8]
    },
    {
        id: '12',
        name: 'Petit Paris',
        code: 'PPA',
        sector: MOCK_SECTORS[8]
    },
    // Centre Ville Quartiers (Abidjan)
    {
        id: '13',
        name: 'Plateau Dokui',
        code: 'PDO',
        sector: MOCK_SECTORS[10]
    },
    {
        id: '14',
        name: 'Plateau Centre',
        code: 'PCE',
        sector: MOCK_SECTORS[10]
    },
    // Zone 4 Quartiers (Abidjan)
    {
        id: '15',
        name: 'Zone 4A',
        code: 'Z4A',
        sector: MOCK_SECTORS[11]
    },
    {
        id: '16',
        name: 'Zone 4B',
        code: 'Z4B',
        sector: MOCK_SECTORS[11]
    }
];

// Helper functions to get data by relationships
export class CountriesOrgMockService {
    
    public getAllCountries(): Country[] {
        return MOCK_COUNTRIES;
    }
    
    public getCitiesByCountry(countryId: string): City[] {
        return MOCK_CITIES.filter(city => city.country.id === countryId);
    }
    
    public getArrondissementsByCity(cityId: string): Arrondissement[] {
        return MOCK_ARRONDISSEMENTS.filter(arr => arr.city.id === cityId);
    }
    
    public getSectorsByArrondissement(arrondissementId: string): Sector[] {
        return MOCK_SECTORS.filter(sector => sector.arrondissement.id === arrondissementId);
    }
    
    public getQuartiersBySector(sectorId: string): Quartier[] {
        return MOCK_QUARTIERS.filter(quartier => quartier.sector.id === sectorId);
    }
    
    public getCountryById(id: string): Country | undefined {
        return MOCK_COUNTRIES.find(country => country.id === id);
    }
    
    public getCityById(id: string): City | undefined {
        return MOCK_CITIES.find(city => city.id === id);
    }
    
    public getArrondissementById(id: string): Arrondissement | undefined {
        return MOCK_ARRONDISSEMENTS.find(arr => arr.id === id);
    }
    
    public getSectorById(id: string): Sector | undefined {
        return MOCK_SECTORS.find(sector => sector.id === id);
    }
    
    public getQuartierById(id: string): Quartier | undefined {
        return MOCK_QUARTIERS.find(quartier => quartier.id === id);
    }
    
    // Get full hierarchy for a quartier
    public getFullHierarchy(quartierId: string): {
        quartier: Quartier;
        sector: Sector;
        arrondissement: Arrondissement;
        city: City;
        country: Country;
    } | null {
        const quartier = this.getQuartierById(quartierId);
        if (!quartier) return null;
        
        return {
            quartier,
            sector: quartier.sector,
            arrondissement: quartier.sector.arrondissement,
            city: quartier.sector.arrondissement.city,
            country: quartier.sector.arrondissement.city.country
        };
    }
}
