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
    // Géolocalisation réelle (models/neighbourhood.js) — optionnels : un quartier créé
    // avant le chantier "géolocalisation des quartiers" peut ne pas encore en avoir
    // (scripts/addCoordinates.js les rétro-remplit progressivement).
    latitude?: number | null;
    longitude?: number | null;
}