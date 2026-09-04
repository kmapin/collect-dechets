import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TerritoryHttpService } from '../../services/territory-http.service';
import { NotificationService } from '../../services/notification.service';

interface QuartierRow {
  id: string;
  name: string;
  code: string;
  sectorId: string;
  arrondissementId: string;
  cityId: string;
  sectorName: string;
  arrondissementName: string;
  cityName: string;
  latitude: number | null;
  longitude: number | null;
}

interface QuartierForm {
  name: string;
  code: string;
  cityId: string;
  arrondissementId: string;
  sectorId: string;
  latitude: number | null;
  longitude: number | null;
}

const EMPTY_FORM: QuartierForm = { name: '', code: '', cityId: '', arrondissementId: '', sectorId: '', latitude: null, longitude: null };

/**
 * "Gestion des quartiers" — chantier "géolocalisation des quartiers". Jusqu'ici, aucune
 * interface ne permettait de créer/modifier un quartier : seul un appel API direct ou le
 * script de seed le pouvait. `latitude`/`longitude` existaient déjà sur le schéma backend
 * (models/neighbourhood.js) mais n'étaient ni exigés ni exposés nulle part côté frontend —
 * la carte "Couverture Territoriale" (admin-dashboard.ts) devait donc s'appuyer sur une
 * table de coordonnées codée en dur (OUAGA_COORDS) faute de vraie donnée. Cette page est le
 * seul point d'entrée réel pour renseigner cette géolocalisation désormais, super_admin
 * uniquement (route gardée par adminGuard, voir app.routes.ts).
 */
@Component({
  selector: 'app-quartiers-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quartiers-management.html',
  styleUrl: './quartiers-management.scss',
})
export class QuartiersManagementComponent implements OnInit {
  isLoading = true;
  isSaving = false;
  erreur: string | null = null;

  quartiers: QuartierRow[] = [];
  filteredQuartiers: QuartierRow[] = [];
  search = '';

  cities: any[] = [];
  arrondissements: any[] = [];
  sectors: any[] = [];

  showForm = false;
  editingId: string | null = null;
  form: QuartierForm = { ...EMPTY_FORM };
  formArrondissements: any[] = [];
  formSectors: any[] = [];

  constructor(
    private readonly territoryService: TerritoryHttpService,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.charger();
  }

  reessayer(): void {
    this.charger();
  }

  private charger(): void {
    this.isLoading = true;
    this.erreur = null;
    forkJoin({
      cities: this.territoryService.getAllCities(),
      arrondissements: this.territoryService.getAllArrondissements(),
      sectors: this.territoryService.getAllSectors(),
      quartiers: this.territoryService.getAllNeighborhoods(),
    }).subscribe({
      next: ({ cities, arrondissements, sectors, quartiers }) => {
        this.cities = cities;
        this.arrondissements = arrondissements;
        this.sectors = sectors;
        this.quartiers = (quartiers as any[]).map((q) => this._toRow(q));
        this.filterer();
        this.isLoading = false;
      },
      error: () => {
        this.erreur = 'Impossible de charger les quartiers.';
        this.isLoading = false;
      },
    });
  }

  private _toRow(q: any): QuartierRow {
    const sector = this.sectors.find((s: any) => s.id === q.sectorId);
    const arrondissement = this.arrondissements.find((a: any) => a.id === sector?.arrondissementId);
    const city = this.cities.find((c: any) => c.id === arrondissement?.cityId);
    return {
      id: q.id,
      name: q.name ?? '',
      code: q.code ?? '',
      sectorId: q.sectorId ?? '',
      arrondissementId: sector?.arrondissementId ?? '',
      cityId: arrondissement?.cityId ?? '',
      sectorName: sector?.name ?? '—',
      arrondissementName: arrondissement?.name ?? '—',
      cityName: city?.name ?? '—',
      latitude: typeof q.latitude === 'number' ? q.latitude : null,
      longitude: typeof q.longitude === 'number' ? q.longitude : null,
    };
  }

  filterer(): void {
    const terme = this.search.trim().toLowerCase();
    this.filteredQuartiers = !terme
      ? this.quartiers
      : this.quartiers.filter((q) =>
          `${q.name} ${q.code} ${q.sectorName} ${q.arrondissementName} ${q.cityName}`.toLowerCase().includes(terme),
        );
  }

  get quartiersSansGeolocalisation(): number {
    return this.quartiers.filter((q) => q.latitude === null || q.longitude === null).length;
  }

  // ── Formulaire création/édition ─────────────────────────────────────────

  ouvrirCreation(): void {
    this.editingId = null;
    this.form = { ...EMPTY_FORM };
    this.formArrondissements = [];
    this.formSectors = [];
    this.showForm = true;
  }

  ouvrirEdition(q: QuartierRow): void {
    this.editingId = q.id;
    this.form = {
      name: q.name,
      code: q.code,
      cityId: q.cityId,
      arrondissementId: q.arrondissementId,
      sectorId: q.sectorId,
      latitude: q.latitude,
      longitude: q.longitude,
    };
    this.formArrondissements = this.arrondissements.filter((a: any) => a.cityId === q.cityId);
    this.formSectors = this.sectors.filter((s: any) => s.arrondissementId === q.arrondissementId);
    this.showForm = true;
  }

  fermerForm(): void {
    this.showForm = false;
  }

  onCityChange(cityId: string): void {
    this.form = { ...this.form, cityId, arrondissementId: '', sectorId: '' };
    this.formArrondissements = this.arrondissements.filter((a: any) => a.cityId === cityId);
    this.formSectors = [];
  }

  onArrondissementChange(arrondissementId: string): void {
    this.form = { ...this.form, arrondissementId, sectorId: '' };
    this.formSectors = this.sectors.filter((s: any) => s.arrondissementId === arrondissementId);
  }

  onSectorChange(sectorId: string): void {
    this.form = { ...this.form, sectorId };
  }

  setField<K extends keyof QuartierForm>(field: K, value: QuartierForm[K]): void {
    this.form = { ...this.form, [field]: value };
  }

  enregistrer(): void {
    const { name, sectorId, latitude, longitude } = this.form;
    if (!name.trim() || !sectorId) {
      this.notificationService.showError('Erreur', 'Le nom et le secteur sont obligatoires.');
      return;
    }
    if (latitude === null || longitude === null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      this.notificationService.showError('Erreur', 'La géolocalisation (latitude, longitude) est obligatoire.');
      return;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      this.notificationService.showError('Erreur', 'Latitude ou longitude invalide.');
      return;
    }

    this.isSaving = true;
    const payload = { name: this.form.name.trim(), code: this.form.code.trim(), sectorId, latitude, longitude };

    const requete = this.editingId
      ? this.territoryService.updateNeighborhood(this.editingId, payload)
      : this.territoryService.createNeighborhood(payload);

    requete.subscribe({
      next: () => {
        this.notificationService.showSuccess('Succès', this.editingId ? 'Quartier modifié avec succès.' : 'Quartier créé avec succès.');
        this.isSaving = false;
        this.showForm = false;
        this.charger();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.notificationService.showError('Erreur', err?.error?.message ?? "Impossible d'enregistrer ce quartier.");
      },
    });
  }

  supprimer(q: QuartierRow): void {
    if (!confirm(`Supprimer le quartier "${q.name}" ? Cette action est irréversible.`)) return;
    this.territoryService.deleteNeighborhood(q.id).subscribe({
      next: () => {
        this.notificationService.showSuccess('Succès', 'Quartier supprimé.');
        this.charger();
      },
      error: (err: any) => this.notificationService.showError('Erreur', err?.error?.message ?? 'Impossible de supprimer ce quartier.'),
    });
  }
}
