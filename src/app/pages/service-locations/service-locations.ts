import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TerritoryHttpService } from '../../services/territory-http.service';
import { NotificationService } from '../../services/notification.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { AuthService } from '../../services/auth.service';
import { Breadcrumb, BreadcrumbItem } from '../../shared/breadcrumb/breadcrumb';
import { dashboardRouteForRole, dashboardLabelForRole } from '../../shared/notification-route.util';
import { PhoneInputDirective } from '../../shared/phone-input.directive';
import { normalizePhone } from '../../shared/phone.util';
import { ServiceLocationService } from '../../services/service-location.service';
import { ServiceLocation, ServiceLocationType, CreateServiceLocationPayload } from '../../models/service-location.model';

interface ServiceLocationForm {
  name: string;
  type: ServiceLocationType | '';
  city: string;
  arrondissement: string;
  sector: string;
  neighborhood: string;
  street: string;
  doorNumber: string;
  doorColor: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  onSiteContactName: string;
  onSiteContactPhone: string;
  accessInstructions: string;
}

const EMPTY_FORM: ServiceLocationForm = {
  name: '',
  type: '',
  city: '',
  arrondissement: '',
  sector: '',
  neighborhood: '',
  street: '',
  doorNumber: '',
  doorColor: '',
  postalCode: '',
  latitude: null,
  longitude: null,
  onSiteContactName: '',
  onSiteContactPhone: '',
  accessInstructions: '',
};

interface TypeOption {
  value: ServiceLocationType;
  label: string;
  icon: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: 'maison', label: 'Maison', icon: 'home' },
  { value: 'boutique', label: 'Boutique', icon: 'storefront' },
  { value: 'bureau', label: 'Bureau', icon: 'business_center' },
  { value: 'restaurant', label: 'Restaurant', icon: 'restaurant' },
  { value: 'entreprise', label: 'Entreprise', icon: 'apartment' },
  { value: 'entrepot', label: 'Entrepôt', icon: 'warehouse' },
  { value: 'chantier', label: 'Chantier', icon: 'construction' },
  { value: 'evenement', label: 'Événement', icon: 'event' },
  { value: 'autre', label: 'Autre', icon: 'place' },
];

@Component({
  selector: 'app-service-locations',
  standalone: true,
  imports: [CommonModule, FormsModule, Breadcrumb, PhoneInputDirective],
  templateUrl: './service-locations.html',
  styleUrl: './service-locations.scss',
})
export class ServiceLocationsComponent implements OnInit {
  private auth = inject(AuthService);

  readonly breadcrumbItems: BreadcrumbItem[] = [
    {
      label: dashboardLabelForRole(this.auth.getCurrentUser()?.role),
      route: dashboardRouteForRole(this.auth.getCurrentUser()?.role),
      icon: 'home',
    },
    { label: 'Mes lieux de service' },
  ];

  readonly typeOptions = TYPE_OPTIONS;

  isLoading = true;
  isSaving = false;
  isDeleting = false;
  erreur: string | null = null;

  locations: ServiceLocation[] = [];
  filteredLocations: ServiceLocation[] = [];
  search = '';

  cities: any[] = [];
  arrondissements: any[] = [];
  sectors: any[] = [];
  neighborhoods: any[] = [];
  isLoadingCities = false;
  isLoadingArrondissements = false;
  isLoadingSectors = false;
  isLoadingNeighborhoods = false;

  showForm = false;
  editingId: string | null = null;
  form: ServiceLocationForm = { ...EMPTY_FORM };

  showDetail = false;
  detailLocation: ServiceLocation | null = null;

  // Phase 9 — QR code par lieu (coexiste avec le QR compte de profile.ts).
  showQrCode = false;
  qrCodeLocation: ServiceLocation | null = null;
  qrCodeDataUrl: string | null = null;
  isLoadingQrCode = false;

  constructor(
    private readonly serviceLocationService: ServiceLocationService,
    private readonly territoryService: TerritoryHttpService,
    private readonly notificationService: NotificationService,
    private readonly confirmDialog: ConfirmDialogService,
  ) {}

  ngOnInit(): void {
    this.charger();
    this.chargerVilles();
  }

  reessayer(): void {
    this.charger();
  }

  private charger(): void {
    this.isLoading = true;
    this.erreur = null;
    this.serviceLocationService.listMine$().subscribe({
      next: ({ data }) => {
        this.locations = data;
        this.filterer();
        this.isLoading = false;
      },
      error: () => {
        this.erreur = 'Impossible de charger vos lieux de service.';
        this.isLoading = false;
      },
    });
  }

  private chargerVilles(): void {
    this.isLoadingCities = true;
    this.territoryService.getAllCities().subscribe({
      next: (cities) => {
        this.cities = cities;
        this.isLoadingCities = false;
      },
      error: () => {
        this.cities = [];
        this.isLoadingCities = false;
      },
    });
  }

  filterer(): void {
    const terme = this.search.trim().toLowerCase();
    this.filteredLocations = !terme
      ? this.locations
      : this.locations.filter((loc) =>
          `${loc.name} ${loc.type} ${loc.address.city} ${loc.address.neighborhood}`.toLowerCase().includes(terme),
        );
  }

  // ── Cascade géographique (Ville → Arrondissement → Secteur → Quartier) ──

  onCityChange(city: string, preserveDownstream = false): void {
    this.arrondissements = [];
    this.sectors = [];
    this.neighborhoods = [];
    this.form = {
      ...this.form,
      city,
      arrondissement: preserveDownstream ? this.form.arrondissement : '',
      sector: preserveDownstream ? this.form.sector : '',
      neighborhood: preserveDownstream ? this.form.neighborhood : '',
    };
    if (!city) return;
    const cityObj = this.cities.find((c: any) => c.name === city);
    if (!cityObj?.id) return;

    this.isLoadingArrondissements = true;
    this.territoryService.getArrondissementsByCity(cityObj.id).subscribe({
      next: (arr) => {
        this.arrondissements = arr;
        this.isLoadingArrondissements = false;
        if (this.form.arrondissement) this.onArrondissementChange(this.form.arrondissement, preserveDownstream);
      },
      error: () => {
        this.arrondissements = [];
        this.isLoadingArrondissements = false;
      },
    });
  }

  onArrondissementChange(arrondissement: string, preserveDownstream = false): void {
    this.sectors = [];
    this.neighborhoods = [];
    this.form = {
      ...this.form,
      arrondissement,
      sector: preserveDownstream ? this.form.sector : '',
      neighborhood: preserveDownstream ? this.form.neighborhood : '',
    };
    if (!arrondissement) return;
    const arrObj = this.arrondissements.find((a: any) => a.name === arrondissement);
    if (!arrObj?.id) return;

    this.isLoadingSectors = true;
    this.territoryService.getSectorsByArrondissement(arrObj.id).subscribe({
      next: (sectors) => {
        this.sectors = sectors;
        this.isLoadingSectors = false;
        if (this.form.sector) this.onSectorChange(this.form.sector, preserveDownstream);
      },
      error: () => {
        this.sectors = [];
        this.isLoadingSectors = false;
      },
    });
  }

  onSectorChange(sector: string, preserveDownstream = false): void {
    this.neighborhoods = [];
    this.form = {
      ...this.form,
      sector,
      neighborhood: preserveDownstream ? this.form.neighborhood : '',
    };
    if (!sector) return;
    const sectorObj = this.sectors.find((s: any) => s.name === sector);
    if (!sectorObj?.id) return;

    this.isLoadingNeighborhoods = true;
    this.territoryService.getNeighborhoodsBySector(sectorObj.id).subscribe({
      next: (n) => {
        this.neighborhoods = n;
        this.isLoadingNeighborhoods = false;
      },
      error: () => {
        this.neighborhoods = [];
        this.isLoadingNeighborhoods = false;
      },
    });
  }

  setField<K extends keyof ServiceLocationForm>(field: K, value: ServiceLocationForm[K]): void {
    this.form = { ...this.form, [field]: value };
  }

  // ── Formulaire création/édition ─────────────────────────────────────────

  ouvrirCreation(): void {
    this.editingId = null;
    this.form = { ...EMPTY_FORM };
    this.arrondissements = [];
    this.sectors = [];
    this.neighborhoods = [];
    this.showForm = true;
  }

  ouvrirEdition(loc: ServiceLocation): void {
    this.editingId = loc._id;
    this.form = {
      name: loc.name,
      type: loc.type,
      city: loc.address.city,
      arrondissement: loc.address.arrondissement,
      sector: loc.address.sector,
      neighborhood: loc.address.neighborhood,
      street: loc.address.street ?? '',
      doorNumber: loc.address.doorNumber ?? '',
      doorColor: loc.address.doorColor ?? '',
      postalCode: loc.address.postalCode ?? '',
      latitude: loc.address.latitude ?? null,
      longitude: loc.address.longitude ?? null,
      onSiteContactName: loc.onSiteContactName ?? '',
      onSiteContactPhone: loc.onSiteContactPhone ?? '',
      accessInstructions: loc.accessInstructions ?? '',
    };
    this.showDetail = false;
    this.showForm = true;
    this.onCityChange(loc.address.city, true);
  }

  fermerForm(): void {
    this.showForm = false;
  }

  enregistrer(): void {
    const { name, type, city, arrondissement, sector, neighborhood } = this.form;
    if (!name.trim() || !type) {
      this.notificationService.showError('Erreur', 'Le nom et le type de lieu sont obligatoires.');
      return;
    }
    if (!city || !arrondissement || !sector || !neighborhood) {
      this.notificationService.showError('Erreur', "L'adresse (ville, arrondissement, secteur, quartier) est obligatoire.");
      return;
    }

    const payload: CreateServiceLocationPayload = {
      name: name.trim(),
      type: type as ServiceLocationType,
      address: {
        city,
        arrondissement,
        sector,
        neighborhood,
        street: this.form.street.trim() || undefined,
        doorNumber: this.form.doorNumber.trim() || undefined,
        doorColor: this.form.doorColor.trim() || undefined,
        postalCode: this.form.postalCode.trim() || undefined,
        latitude: this.form.latitude ?? undefined,
        longitude: this.form.longitude ?? undefined,
      },
      onSiteContactName: this.form.onSiteContactName.trim() || undefined,
      onSiteContactPhone: normalizePhone(this.form.onSiteContactPhone) || undefined,
      accessInstructions: this.form.accessInstructions.trim() || undefined,
    };

    this.isSaving = true;
    const requete = this.editingId
      ? this.serviceLocationService.update$(this.editingId, payload)
      : this.serviceLocationService.create$(payload);

    requete.subscribe({
      next: () => {
        this.notificationService.showSuccess('Succès', this.editingId ? 'Lieu modifié avec succès.' : 'Lieu ajouté avec succès.');
        this.isSaving = false;
        this.showForm = false;
        this.charger();
      },
      error: (err: any) => {
        this.isSaving = false;
        this.notificationService.showError('Erreur', err?.error?.error?.message ?? "Impossible d'enregistrer ce lieu.");
      },
    });
  }

  // ── Détail ───────────────────────────────────────────────────────────

  voir(loc: ServiceLocation): void {
    this.detailLocation = loc;
    this.showDetail = true;
  }

  fermerDetail(): void {
    this.showDetail = false;
    this.detailLocation = null;
  }

  modifierDepuisDetail(): void {
    if (!this.detailLocation) return;
    this.ouvrirEdition(this.detailLocation);
  }

  // ── QR code du lieu (Phase 9) ────────────────────────────────────────

  voirQrCode(loc: ServiceLocation): void {
    this.qrCodeLocation = loc;
    this.qrCodeDataUrl = null;
    this.showQrCode = true;
    this.isLoadingQrCode = true;
    this.serviceLocationService.getQrCode$(loc._id).subscribe({
      next: ({ data }) => {
        this.qrCodeDataUrl = data.qrCode;
        this.isLoadingQrCode = false;
      },
      error: () => {
        this.isLoadingQrCode = false;
        this.notificationService.showError('Erreur', 'Impossible de générer le QR code de ce lieu.');
        this.showQrCode = false;
      },
    });
  }

  fermerQrCode(): void {
    this.showQrCode = false;
    this.qrCodeLocation = null;
    this.qrCodeDataUrl = null;
  }

  // ── Désactivation ────────────────────────────────────────────────────

  async desactiver(loc: ServiceLocation): Promise<void> {
    if (this.isDeleting) return;
    const ok = await this.confirmDialog.confirm({
      title: `Désactiver "${loc.name}" ?`,
      message: 'Ce lieu de service ne sera plus proposé pour de nouvelles collectes ou de nouveaux abonnements.',
      variant: 'danger',
      confirmLabel: 'Désactiver',
    });
    if (!ok) return;

    this.isDeleting = true;
    this.serviceLocationService.delete$(loc._id).subscribe({
      next: () => {
        this.isDeleting = false;
        this.notificationService.showSuccess('Succès', 'Lieu désactivé.');
        this.charger();
      },
      error: (err: any) => {
        this.isDeleting = false;
        this.notificationService.showError('Erreur', err?.error?.error?.message ?? 'Impossible de désactiver ce lieu.');
      },
    });
  }

  // ── Libellés / icônes ────────────────────────────────────────────────

  typeLabel(type: ServiceLocationType): string {
    return this.typeOptions.find((t) => t.value === type)?.label ?? type;
  }

  typeIcon(type: ServiceLocationType): string {
    return this.typeOptions.find((t) => t.value === type)?.icon ?? 'place';
  }

  coverageLabel(status: ServiceLocation['coverageStatus']): string {
    if (status === 'covered') return 'Couvert';
    if (status === 'not_covered') return 'Non couvert';
    return 'Vérification en cours';
  }

  coverageClass(status: ServiceLocation['coverageStatus']): string {
    if (status === 'covered') return 'sl-badge--success';
    if (status === 'not_covered') return 'sl-badge--danger';
    return 'sl-badge--pending';
  }

  statusLabel(status: ServiceLocation['status']): string {
    return status === 'active' ? 'Actif' : 'Inactif';
  }

  statusClass(status: ServiceLocation['status']): string {
    return status === 'active' ? 'sl-badge--success' : 'sl-badge--neutral';
  }
}
