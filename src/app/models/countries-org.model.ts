export interface Country {
    id: string;
    name: string;
    code: string;
}

export interface City {
    id: string;
    name: string;
    code: string;
    country: Country;
}

export interface Arrondissement {
    id: string;
    name: string;
    code: string;
    city: City;
}
export interface Sector {
    id: string;
    name: string;
    code: string;
    arrondissement: Arrondissement;
}

export interface Quartier {
    id: string;
    name: string;
    code: string;
    sector: Sector;
}