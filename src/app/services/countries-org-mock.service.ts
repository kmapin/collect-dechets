import { Injectable } from '@angular/core';
import { Country, City, Arrondissement, Sector, Quartier } from '../models/countries-org.model';
import { MOCK_COUNTRIES, MOCK_CITIES, MOCK_ARRONDISSEMENTS, MOCK_SECTORS, MOCK_QUARTIERS } from '../data/countries-org.mock';

@Injectable({
  providedIn: 'root'
})
export class CountriesOrgMockService {
  getAllCountries(): Country[] {
    return MOCK_COUNTRIES;
  }

  getCitiesByCountry(countryId: string): City[] {
    return MOCK_CITIES.filter(city => city.country.id === countryId);
  }

  getArrondissementsByCity(cityId: string): Arrondissement[] {
    return MOCK_ARRONDISSEMENTS.filter(arr => arr.city.id === cityId);
  }
  getArrondissementsByCityLabel(cityId: string): Arrondissement[] {
    return MOCK_ARRONDISSEMENTS.filter(arr => arr.city.name === cityId);
  }

  getSectorsByArrondissement(arrondissementId: string): Sector[] {
    return MOCK_SECTORS.filter(sector => sector.arrondissement.id === arrondissementId);
  }

  getNeighborhoodsBySector(sectorId: string): Quartier[] {
    return MOCK_QUARTIERS.filter(quartier => quartier.sector.id === sectorId);
  }
  // getArrondissementsByCityLabel(cityLabel: string): Arrondissement[] {
  //   const city = MOCK_CITIES.find(c => c.city.label === cityLabel);
  //   return city ? this.getArrondissementsByCity(city.id) : [];
  // }

  getCountryById(id: string): Country | undefined {
    return MOCK_COUNTRIES.find(country => country.id === id);
  }

  getCityById(id: string): City | undefined {
    return MOCK_CITIES.find(city => city.id === id);
  }

  getArrondissementById(id: string): Arrondissement | undefined {
    return MOCK_ARRONDISSEMENTS.find(arr => arr.id === id);
  }

  getSectorById(id: string): Sector | undefined {
    return MOCK_SECTORS.find(sector => sector.id === id);
  }

  getQuartierById(id: string): Quartier | undefined {
    return MOCK_QUARTIERS.find(quartier => quartier.id === id);
  }

  getQuartierByName(name: string){
    return MOCK_QUARTIERS.find(quartier => quartier.name === name);
  }
  getQuartierInfo(name: string) : {
    quartier: Quartier;
    sector: Sector;
    arrondissement: Arrondissement;
    city: City;
    country: Country;
  } | null {
    const quartier = this.getQuartierByName(name);
    if(!quartier) return null;

    // Get full hierarchy for a quartier
    return {
      quartier,
      sector: quartier.sector,
      arrondissement: quartier.sector.arrondissement,
      city: quartier.sector.arrondissement.city,
      country: quartier.sector.arrondissement.city.country
    };
  }

  getFullHierarchy(quartierId: string): {
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

  getAllArrondissementsByVille(villeId: string): Arrondissement[] {
    return MOCK_ARRONDISSEMENTS.filter(arr => arr.city.name === villeId);
  }
  getAllSectorsByVille(villeId: string): Sector[] {
    return MOCK_SECTORS.filter(secteur => secteur.arrondissement.city.name === villeId);
  }
  getAllNeighborhoodsByVille(villeId: string): Quartier[] {
    return MOCK_QUARTIERS.filter(quartier => quartier.sector.arrondissement.city.name === villeId);
  }
}
