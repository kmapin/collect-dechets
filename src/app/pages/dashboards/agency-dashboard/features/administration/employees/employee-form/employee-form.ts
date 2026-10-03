import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { EmployeeAdministrationService } from '../employee-administration.service';
import { Employee, EMPLOYEE_ROLES } from '../employee.model';
import { NotificationService } from '../../../../../../../services/notification.service';
import { TerritoryHttpService } from '../../../../../../../services/territory-http.service';
import { TerritorySelectComponent, TerritoryOption, toTerritoryOptionsById } from '../../../../../../../shared/territory-select/territory-select';

/** Même validateur que agency-dashboard.ts::passwordMatchValidator (mot de passe requis
 * uniquement à la création — voir toggleValidateursMotDePasse ci-dessous). */
function passwordMatchValidator(): ValidatorFn {
  return (group): ValidationErrors | null => {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    if (!password && !confirmPassword) return null;
    return password === confirmPassword ? null : { passwordMismatch: true };
  };
}

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TerritorySelectComponent],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.scss',
})
export class EmployeeForm implements OnChanges, OnInit {
  /** null = création, sinon édition de cet employé. */
  @Input() employee: Employee | null = null;
  @Output() saved = new EventEmitter<Employee>();
  @Output() cancelled = new EventEmitter<void>();

  readonly roles = EMPLOYEE_ROLES;
  form: FormGroup;
  enregistrementEnCours = false;
  erreurApi = '';

  // Filtres géographiques en cascade (même service/pattern que employees-list.ts et
  // quartiers-management.ts) — toute la hiérarchie est chargée en une fois (4 appels
  // sans filtre) plutôt qu'en cascade HTTP par niveau : ça permet de résoudre
  // immédiatement, côté client, les NOMS déjà présents sur l'employé en édition vers
  // leurs ids Territory (nécessaires pour pré-remplir les selects), sans quoi il
  // faudrait enchaîner 3 appels HTTP séquentiels avant de savoir quoi présélectionner.
  // Le FormGroup, lui, continue de ne stocker QUE des noms (address.city/arrondissement/
  // sector/neighborhood) — c'est ce que le backend attend (services/employeesAdministration.js),
  // jamais une référence vers les collections Territory.
  private territoiresCharges = false;
  private toutesLesVilles: Array<{ id: string; name: string }> = [];
  private tousLesArrondissements: Array<{ id: string; name: string; cityId: string }> = [];
  private tousLesSecteurs: Array<{ id: string; name: string; arrondissementId: string }> = [];
  private tousLesQuartiers: Array<{ id: string; name: string; sectorId: string }> = [];

  villesOptions: TerritoryOption[] = [];
  arrondissementsOptions: TerritoryOption[] = [];
  secteursOptions: TerritoryOption[] = [];
  quartiersOptions: TerritoryOption[] = [];

  selectedVilleId: string | number | null = null;
  selectedArrondissementId: string | number | null = null;
  selectedSecteurId: string | number | null = null;
  selectedQuartierId: string | number | null = null;

  get estEdition(): boolean {
    return !!this.employee;
  }

  constructor(
    private fb: FormBuilder,
    private employeeAdministrationService: EmployeeAdministrationService,
    private notification: NotificationService,
    private territoryService: TerritoryHttpService,
  ) {
    this.form = this.creerFormulaire();
  }

  ngOnInit(): void {
    this.chargerTerritoires();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employee']) {
      this.form = this.creerFormulaire();
      this.erreurApi = '';
      if (this.territoiresCharges) {
        this.synchroniserSelectsDepuisAdresse();
      }
    }
  }

  private chargerTerritoires(): void {
    forkJoin({
      villes: this.territoryService.getAllCities(),
      arrondissements: this.territoryService.getAllArrondissements(),
      secteurs: this.territoryService.getAllSectors(),
      quartiers: this.territoryService.getAllNeighborhoods(),
    }).subscribe({
      next: ({ villes, arrondissements, secteurs, quartiers }) => {
        this.toutesLesVilles = villes as any;
        this.tousLesArrondissements = arrondissements as any;
        this.tousLesSecteurs = secteurs as any;
        this.tousLesQuartiers = quartiers as any;
        this.villesOptions = toTerritoryOptionsById(this.toutesLesVilles);
        this.territoiresCharges = true;
        this.synchroniserSelectsDepuisAdresse();
      },
      error: () => {
        // Les selects territoriaux restent vides — l'utilisateur peut toujours saisir
        // via le formulaire (champs requis, soumission bloquée tant qu'ils sont vides),
        // pas de blocage total de l'écran pour une panne du service territoire.
      },
    });
  }

  private _memeNom(a: string | undefined | null, b: string | undefined | null): boolean {
    return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
  }

  /** Reconstruit les 4 niveaux de sélection (id + options filtrées) à partir des NOMS
   * actuellement dans form.address — appelé après chargement des territoires et à
   * chaque changement d'employé en édition, pour pré-sélectionner les bons selects. */
  private synchroniserSelectsDepuisAdresse(): void {
    const adresse = this.form.get('address')?.value ?? {};

    const ville = this.toutesLesVilles.find((v) => this._memeNom(v.name, adresse.city));
    this.selectedVilleId = ville?.id ?? null;
    this.arrondissementsOptions = this.selectedVilleId
      ? toTerritoryOptionsById(this.tousLesArrondissements.filter((a) => a.cityId === this.selectedVilleId))
      : [];

    const arrondissement = this.selectedVilleId
      ? this.tousLesArrondissements.find((a) => a.cityId === this.selectedVilleId && this._memeNom(a.name, adresse.arrondissement))
      : undefined;
    this.selectedArrondissementId = arrondissement?.id ?? null;
    this.secteursOptions = this.selectedArrondissementId
      ? toTerritoryOptionsById(this.tousLesSecteurs.filter((s) => s.arrondissementId === this.selectedArrondissementId))
      : [];

    const secteur = this.selectedArrondissementId
      ? this.tousLesSecteurs.find((s) => s.arrondissementId === this.selectedArrondissementId && this._memeNom(s.name, adresse.sector))
      : undefined;
    this.selectedSecteurId = secteur?.id ?? null;
    this.quartiersOptions = this.selectedSecteurId
      ? toTerritoryOptionsById(this.tousLesQuartiers.filter((q) => q.sectorId === this.selectedSecteurId))
      : [];

    const quartier = this.selectedSecteurId
      ? this.tousLesQuartiers.find((q) => q.sectorId === this.selectedSecteurId && this._memeNom(q.name, adresse.neighborhood))
      : undefined;
    this.selectedQuartierId = quartier?.id ?? null;
  }

  private adresseGroup(): FormGroup {
    return this.form.get('address') as FormGroup;
  }

  changerVille(id: string | number | null): void {
    this.selectedVilleId = id;
    this.selectedArrondissementId = null;
    this.selectedSecteurId = null;
    this.selectedQuartierId = null;
    this.arrondissementsOptions = id
      ? toTerritoryOptionsById(this.tousLesArrondissements.filter((a) => a.cityId === id))
      : [];
    this.secteursOptions = [];
    this.quartiersOptions = [];

    const nom = this.villesOptions.find((o) => o.value === id)?.label ?? '';
    const groupe = this.adresseGroup();
    groupe.get('city')?.setValue(nom);
    groupe.get('city')?.markAsTouched();
    groupe.get('arrondissement')?.setValue('');
    groupe.get('sector')?.setValue('');
    groupe.get('neighborhood')?.setValue('');
  }

  changerArrondissement(id: string | number | null): void {
    this.selectedArrondissementId = id;
    this.selectedSecteurId = null;
    this.selectedQuartierId = null;
    this.secteursOptions = id
      ? toTerritoryOptionsById(this.tousLesSecteurs.filter((s) => s.arrondissementId === id))
      : [];
    this.quartiersOptions = [];

    const nom = this.arrondissementsOptions.find((o) => o.value === id)?.label ?? '';
    const groupe = this.adresseGroup();
    groupe.get('arrondissement')?.setValue(nom);
    groupe.get('arrondissement')?.markAsTouched();
    groupe.get('sector')?.setValue('');
    groupe.get('neighborhood')?.setValue('');
  }

  changerSecteur(id: string | number | null): void {
    this.selectedSecteurId = id;
    this.selectedQuartierId = null;
    this.quartiersOptions = id
      ? toTerritoryOptionsById(this.tousLesQuartiers.filter((q) => q.sectorId === id))
      : [];

    const nom = this.secteursOptions.find((o) => o.value === id)?.label ?? '';
    const groupe = this.adresseGroup();
    groupe.get('sector')?.setValue(nom);
    groupe.get('sector')?.markAsTouched();
    groupe.get('neighborhood')?.setValue('');
  }

  changerQuartier(id: string | number | null): void {
    this.selectedQuartierId = id;
    const nom = this.quartiersOptions.find((o) => o.value === id)?.label ?? '';
    const groupe = this.adresseGroup();
    groupe.get('neighborhood')?.setValue(nom);
    groupe.get('neighborhood')?.markAsTouched();
  }

  private creerFormulaire(): FormGroup {
    const e = this.employee;
    return this.fb.group(
      {
        firstName: [e?.firstName ?? '', [Validators.required, Validators.minLength(2)]],
        lastName: [e?.lastName ?? '', [Validators.required, Validators.minLength(2)]],
        // Optionnel côté backend (services/employeesAdministration.js) — connexion
        // possible par téléphone seul, même règle que le formulaire employé existant.
        email: [e?.email ?? '', [Validators.email]],
        password: ['', this.estEdition ? [] : [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', this.estEdition ? [] : [Validators.required]],
        phone: [e?.phone ?? '', [Validators.required, Validators.pattern(/^[0-9+\-\s]+$/)]],
        role: [e?.role ?? '', Validators.required],
        address: this.fb.group({
          street: [e?.address?.street ?? ''],
          arrondissement: [e?.address?.arrondissement ?? '', Validators.required],
          sector: [e?.address?.sector ?? '', Validators.required],
          doorNumber: [e?.address?.doorNumber ?? ''],
          doorColor: [e?.address?.doorColor ?? ''],
          neighborhood: [e?.address?.neighborhood ?? '', Validators.required],
          city: [e?.address?.city ?? '', Validators.required],
          postalCode: [e?.address?.postalCode ?? ''],
        }),
      },
      { validators: passwordMatchValidator() },
    );
  }

  champInvalide(nomChamp: string): boolean {
    const champ = this.form.get(nomChamp);
    return !!champ && champ.invalid && (champ.dirty || champ.touched);
  }

  champAdresseInvalide(nomChamp: string): boolean {
    const champ = this.form.get('address')?.get(nomChamp);
    return !!champ && champ.invalid && (champ.dirty || champ.touched);
  }

  annuler(): void {
    this.cancelled.emit();
  }

  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.erreurApi = '';
    this.enregistrementEnCours = true;
    const valeurs = this.form.value;

    const requete$ = this.estEdition
      ? this.employeeAdministrationService.update(this.employee!._id, {
          firstName: valeurs.firstName,
          lastName: valeurs.lastName,
          email: valeurs.email || undefined,
          phone: valeurs.phone,
          role: valeurs.role,
          address: valeurs.address,
        })
      : this.employeeAdministrationService.create({
          firstName: valeurs.firstName,
          lastName: valeurs.lastName,
          email: valeurs.email || undefined,
          phone: valeurs.phone,
          password: valeurs.password,
          role: valeurs.role,
          address: valeurs.address,
        });

    requete$.subscribe({
      next: (employe) => {
        this.enregistrementEnCours = false;
        this.notification.showSuccess(
          this.estEdition ? 'Employé mis à jour' : 'Employé créé',
          `${employe.firstName} ${employe.lastName} a été ${this.estEdition ? 'mis à jour' : 'créé'} avec succès.`,
        );
        this.saved.emit(employe);
      },
      error: (err: HttpErrorResponse) => {
        this.enregistrementEnCours = false;
        // Doublon téléphone/email ou rôle invalide -> message backend exact
        // (services/employeesAdministration.js), jamais reformulé ici.
        this.erreurApi = err.error?.message ?? "Une erreur est survenue. Veuillez réessayer.";
      },
    });
  }
}
