export interface Country {
    id: string;
    name: string;
    code?: string;
    latitude?: number;
    longitude?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface City {
    id: string;
    name: string;
    code?: string;
    country: Country;
    countryId? : string;
    isArrondissement?: boolean;
    latitude?: number;
    longitude?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Arrondissement {
    id: string;
    name: string;
    code?: string;
    city: City;
    cityId?: string;
    latitude?: number;
    longitude?: number;
    createdAt?: string;
    updatedAt?: string;
}
export interface Sector {
    id: string;
    name: string;
    code?: string;
    arrondissement: Arrondissement;
    arrondissementId?: string;
    cityId?: string;
    latitude?: number;
    longitude?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Quartier {
    id: string;
    name: string;
    code?: string;
    sector: Sector;
    sectorId?: string;
    arrondissementId?: string;
    cityId?: string;
    latitude?: number | null;
    longitude?: number | null;
    createdAt?: string;
    updatedAt?: string;
}