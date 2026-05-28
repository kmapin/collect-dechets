import { Component, OnInit, signal, computed, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { PlanningService } from '../services/planning.service';
import { PlanningType } from '../models/planning.model';
import { PlanningTypeSelectorComponent } from '../planning-type-selector/planning-type-selector';
import { ZoneSelectorComponent, ZoneSelection } from '../zone-selector/zone-selector';
import { TeamConflictDetectorComponent } from '../team-conflict-detector/team-conflict-detector';

// ---- Local interfaces ----
interface StepDef {
  index: number;
  label: string;
  icon: string;
  description: string;
}

interface WasteTypeOpt {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

interface TeamOpt {
  id: string;
  name: string;
  membersCount: number;
  vehicle: string;
  status: 'disponible' | 'en_service' | 'indisponible';
  busyDate?: string;
}

interface ClientOpt {
  id: string;
  name: string;
  address: string;
  zone: string;
  phone?: string;
}

@Component({
  selector: 'app-planning-create',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, MatIconModule,
    SelectModule, DatePickerModule, ToastModule, TooltipModule, TagModule,
    PlanningTypeSelectorComponent,
    ZoneSelectorComponent,
    TeamConflictDetectorComponent,
  ],
  templateUrl: './planning-create.html',
  styleUrl: './planning-create.scss',
  providers: [MessageService],
})
export class PlanningCreate implements OnInit {
  private fb         = inject(FormBuilder);
  private router     = inject(Router);
  private svc        = inject(PlanningService);
  private msgSvc     = inject(MessageService);
  private destroyRef = inject(DestroyRef);

  // ---- State ----
  currentStep  = signal(0);
  draftSaved   = signal(false);
  isSubmitting = signal(false);

  readonly today = new Date();

  // ---- Step definitions ----
  readonly steps: StepDef[] = [
    { index: 0, label: 'Type',       icon: 'category',       description: 'Type de planning' },
    { index: 1, label: 'Cible',      icon: 'location_on',    description: 'Sélection de la cible' },
    { index: 2, label: 'Calendrier', icon: 'calendar_today', description: 'Paramètres temporels' },
    { index: 3, label: 'Déchets',    icon: 'delete_outline', description: 'Types de déchets' },
    { index: 4, label: 'Équipes',    icon: 'groups',         description: 'Affectation équipes' },
    { index: 5, label: 'Récap',      icon: 'summarize',      description: 'Récapitulatif' },
    { index: 6, label: 'Publication',icon: 'publish',        description: 'Publier le planning' },
  ];

  // ---- Static options ----
  readonly planningTypes = [
    { value: 'individuel', label: 'Client individuel', icon: 'person',    color: '#3b82f6', bg: '#eff6ff', desc: 'Planifier pour un client spécifique' },
    { value: 'groupe',     label: 'Groupe de clients', icon: 'groups',    color: '#8b5cf6', bg: '#f5f3ff', desc: 'Planifier pour un groupe constitué' },
    { value: 'zone',       label: 'Par zone',          icon: 'map',       color: '#16a34a', bg: '#f0fdf4', desc: 'Couvrir toute une zone géographique' },
    { value: 'secteur',    label: 'Par secteur',       icon: 'grid_view', color: '#f59e0b', bg: '#fffbeb', desc: 'Planifier par secteur administratif' },
  ];

  readonly wasteTypeOpts: WasteTypeOpt[] = [
    { id: 'menagers',    label: 'Déchets ménagers', icon: 'home',        color: '#16a34a', bg: '#f0fdf4' },
    { id: 'recyclables', label: 'Recyclables',      icon: 'recycling',   color: '#3b82f6', bg: '#eff6ff' },
    { id: 'verts',       label: 'Déchets verts',    icon: 'park',        color: '#22c55e', bg: '#dcfce7' },
    { id: 'encombrants', label: 'Encombrants',      icon: 'inventory_2', color: '#f59e0b', bg: '#fffbeb' },
    { id: 'speciaux',    label: 'Déchets spéciaux', icon: 'warning',     color: '#ef4444', bg: '#fef2f2' },
  ];

  readonly frequencies = [
    { value: 'unique',       label: 'Collecte unique' },
    { value: 'hebdomadaire', label: 'Hebdomadaire' },
    { value: 'bimensuel',    label: 'Bimensuel (2×/semaine)' },
    { value: 'mensuel',      label: 'Mensuel' },
  ];

  readonly frequencyDays = [
    { value: 'lundi',    label: 'Lun' },
    { value: 'mardi',    label: 'Mar' },
    { value: 'mercredi', label: 'Mer' },
    { value: 'jeudi',    label: 'Jeu' },
    { value: 'vendredi', label: 'Ven' },
    { value: 'samedi',   label: 'Sam' },
    { value: 'dimanche', label: 'Dim' },
  ];

  readonly villes = ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora'];

  readonly arrondissements: Record<string, string[]> = {
    'Ouagadougou':    ['Baskuy', 'Bogodogo', 'Boulmiougou', 'Nongremassom', 'Sig-Noghin'],
    'Bobo-Dioulasso': ['Do', 'Dô', 'Konsa', 'Dafra', 'Kuinima'],
    'Koudougou':      ['Arrondissement 1', 'Arrondissement 2'],
    'Banfora':        ['Arrondissement 1'],
  };

  readonly secteurs: Record<string, string[]> = {
    'Baskuy':      ['Secteur 1', 'Secteur 2', 'Secteur 3', 'Secteur 4', 'Secteur 5'],
    'Bogodogo':    ['Secteur 6', 'Secteur 7', 'Secteur 8', 'Secteur 9', 'Secteur 10'],
    'Boulmiougou': ['Secteur 11', 'Secteur 12', 'Secteur 13', 'Secteur 14', 'Secteur 15'],
    'Do':          ['Secteur 1', 'Secteur 2', 'Secteur 3'],
    'Dô':          ['Secteur 4', 'Secteur 5'],
  };

  readonly quartiers: Record<string, string[]> = {
    'Secteur 3':  ['Dassasgho', 'Wayalghin', 'Bendogo', 'Peuloghin'],
    'Secteur 4':  ['Karpala', 'Gampèla', 'Nioko 1', 'Nioko 2'],
    'Secteur 10': ['Kossodo', 'Tampouy', 'Nonsin'],
    'Secteur 1':  ['Wemtenga', 'Pissy', 'Gounghin'],
    'Secteur 7':  ['Zogona', 'Koulouba', 'Bilbalgo'],
  };

  readonly mockClients: ClientOpt[] = [
    { id: 'C001', name: 'Diabré Alain',      address: 'Secteur 3, Dassasgho', zone: 'Baskuy',     phone: '70 00 00 01' },
    { id: 'C002', name: 'Ouédraogo Marie',   address: 'Secteur 4, Karpala',   zone: 'Baskuy',     phone: '70 00 00 02' },
    { id: 'C003', name: 'Traoré Boubacar',   address: 'Secteur 10, Kossodo',  zone: 'Bogodogo',   phone: '70 00 00 03' },
    { id: 'C004', name: 'Sawadogo Fatima',   address: 'Secteur 7, Zogona',    zone: 'Bogodogo',   phone: '70 00 00 04' },
    { id: 'C005', name: 'Kaboré Ibrahim',    address: 'Secteur 1, Wemtenga',  zone: 'Sig-Noghin', phone: '70 00 00 05' },
    { id: 'C006', name: 'Compaoré Aïcha',    address: 'Secteur 2, Tampouy',   zone: 'Boulmiougou',phone: '70 00 00 06' },
  ];

  readonly mockTeams: TeamOpt[] = [
    { id: 'T1', name: 'Equipe 1', membersCount: 4, vehicle: 'Camion 01 – 5T', status: 'disponible' },
    { id: 'T2', name: 'Equipe 2', membersCount: 3, vehicle: 'Camion 02 – 3T', status: 'disponible' },
    { id: 'T3', name: 'Equipe 3', membersCount: 4, vehicle: 'Camion 03 – 5T', status: 'en_service', busyDate: '12/06/2025' },
    { id: 'T4', name: 'Equipe 4', membersCount: 3, vehicle: 'Camion 04 – 3T', status: 'indisponible' },
  ];

  // ---- Form ----
  form!: FormGroup;

  // ---- formValue signal : rend le formulaire réactif pour les computed() ----
  formValue = signal<Record<string, any>>({});

  // ---- Selection signals ----
  selectedWasteTypes  = signal<string[]>([]);
  selectedTeams       = signal<string[]>([]);
  selectedClients     = signal<ClientOpt[]>([]);
  frequencyDaysSel    = signal<string[]>([]);
  filteredClients     = signal<ClientOpt[]>([]);
  clientSearchQuery   = signal('');

  // ---- Computed ----
  currentType = computed<string>(() => this.formValue()['type'] ?? '');

  estimatedHouseholds = computed<number>(() => {
    const fv   = this.formValue();
    const type = fv['type'] ?? '';
    if (type === 'individuel') return this.selectedClients().length > 0 ? 1 : 0;
    if (type === 'groupe')     return this.selectedClients().length;
    if (type === 'zone') {
      const q = fv['quartier'];
      const s = fv['secteur'];
      return q ? (this._hhByQuartier[q] ?? 50) : s ? (this._hhBySecteur[s] ?? 120) : 0;
    }
    if (type === 'secteur') {
      return this._hhBySecteur[fv['secteur']] ?? 0;
    }
    return 0;
  });

  estimatedDuration = computed<string>(() => {
    const h = this.estimatedHouseholds();
    const t = this.selectedTeams().length || 1;
    if (!h) return '--';
    const totalMin = Math.ceil((h * 5) / t);
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    return hh > 0 ? `${hh}h${String(mm).padStart(2, '0')}` : `${mm} min`;
  });

  conflictingTeamIds = computed<string[]>(() => {
    const date = this._formatDateToStr(this.formValue()['date']);
    const teamIds = this.selectedTeams();
    if (!date || !teamIds.length) return [];
    const plannings = this.svc.plannings();
    return teamIds.filter(id => {
      const name = this._teamNameById(id);
      return plannings.some(p => p.teams.includes(name) && p.date === date && p.status !== 'annule');
    });
  });

  autoName = computed<string>(() => {
    const fv   = this.formValue();
    const type = fv['type'] ?? '';
    if (!type) return '';
    let target = '';
    if (type === 'individuel' && this.selectedClients()[0]) target = this.selectedClients()[0].name;
    else if (type === 'groupe')  target = fv['groupName'] || 'Groupe';
    else if (type === 'zone')    target = fv['quartier'] || fv['secteur'] || 'Zone';
    else if (type === 'secteur') target = fv['secteur'] || 'Secteur';
    const date = this._formatDateToStr(fv['date']);
    return [target, date].filter(v => !!v).join(' – ');
  });

  suggestedTeams = computed<TeamOpt[]>(() =>
    this.mockTeams.filter(t => t.status === 'disponible')
  );

  stepProgress = computed<number>(() => ((this.currentStep() + 1) / this.steps.length) * 100);

  // formValue() est lu ici → les computed se recalculent à chaque changement du formulaire
  canGoNext  = computed<boolean>(() => { this.formValue(); return this._isStepValid(this.currentStep()); });
  stepErrors = computed<string[]>(() => { this.formValue(); return this._getStepErrors(this.currentStep()); });

  // ---- Household estimates ----
  private _hhByQuartier: Record<string, number> = {
    Dassasgho: 45, Wayalghin: 32, Bendogo: 28, Peuloghin: 20,
    Karpala: 55, Gampèla: 40, 'Nioko 1': 35, 'Nioko 2': 30,
    Kossodo: 60, Tampouy: 48, Nonsin: 22, Wemtenga: 38, Pissy: 50,
  };
  private _hhBySecteur: Record<string, number> = {
    'Secteur 3': 125, 'Secteur 4': 140, 'Secteur 10': 130,
    'Secteur 1': 110, 'Secteur 7': 118,
  };

  // ---- Lifecycle ----
  ngOnInit(): void {
    this._initForm();
    this._loadDraft();
    this._syncFormValueSignal();
    this._setupAutoSave();
    this._watchTypeChange();
  }

  private _initForm(): void {
    this.form = this.fb.group({
      type:               ['', Validators.required],
      clientId:           [''],
      clientName:         [''],
      groupName:          [''],
      ville:              [''],
      arrondissement:     [''],
      secteur:            [''],
      quartier:           [''],
      date:               [null, Validators.required],
      startTime:          ['08:00', Validators.required],
      endTime:            [''],
      frequency:          ['unique', Validators.required],
      frequencyDays:      [[]],
      endDate:            [null],
      wasteTypes:         [[]],
      specialInstructions:[''],
      teams:              [[]],
      libelle:            ['', Validators.required],
      notes:              [''],
      publishImmediately: [true],
      notifyClients:      [true],
      notifyTeams:        [true],
    });
  }

  private _loadDraft(): void {
    try {
      const raw = localStorage.getItem('planning_draft');
      if (!raw) return;
      const d = JSON.parse(raw);
      this.form.patchValue(d);
      if (d.wasteTypes?.length)  this.selectedWasteTypes.set(d.wasteTypes);
      if (d.teams?.length)       this.selectedTeams.set(d.teams);
      if (d.frequencyDays?.length) this.frequencyDaysSel.set(d.frequencyDays);
    } catch { /* ignore */ }
  }

  private _syncFormValueSignal(): void {
    // Synchronise formValue (signal) avec le formulaire réactif
    // → rend tous les computed() dépendants du formulaire réactifs
    this.form.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(v => this.formValue.set(v));
  }

  private _watchTypeChange(): void {
    this.form.get('type')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.form.patchValue(
        { clientId: '', clientName: '', groupName: '', ville: '', arrondissement: '', secteur: '', quartier: '' },
        { emitEvent: false },
      );
      this.selectedClients.set([]);
      this.clientSearchQuery.set('');
      this.filteredClients.set([]);
    });
  }

  private _setupAutoSave(): void {
    this.form.valueChanges.pipe(
      debounceTime(800),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(v => {
      localStorage.setItem('planning_draft', JSON.stringify(v));
      this.draftSaved.set(true);
      setTimeout(() => this.draftSaved.set(false), 2000);
    });
  }

  // ---- Step navigation ----
  nextStep(): void {
    if (this._isStepValid(this.currentStep()) && this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevStep(): void {
    if (this.currentStep() > 0) {
      this.currentStep.update(s => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  goToStep(i: number): void {
    if (i <= this.currentStep()) this.currentStep.set(i);
  }

  isStepCompleted(i: number): boolean { return i < this.currentStep() && this._isStepValid(i); }
  isStepActive(i: number): boolean    { return i === this.currentStep(); }

  private _isStepValid(step: number): boolean {
    const fv = this.formValue();
    switch (step) {
      case 0: return !!fv['type'];
      case 1: return this._validateTarget(fv);
      case 2: return !!fv['date'] && !!fv['startTime'];
      case 3: return this.selectedWasteTypes().length > 0;
      case 4: return this.selectedTeams().length > 0;
      case 5: return true;
      case 6: return !!fv['libelle'];
      default: return true;
    }
  }

  private _validateTarget(fv: Record<string, any>): boolean {
    const t = fv['type'];
    if (t === 'individuel') return !!fv['clientId'];
    if (t === 'groupe')     return !!fv['groupName'] && this.selectedClients().length >= 2;
    if (t === 'zone')       return !!(fv['quartier'] || fv['secteur']);
    if (t === 'secteur')    return !!fv['secteur'];
    return false;
  }

  private _getStepErrors(step: number): string[] {
    const errs: string[] = [];
    const fv = this.formValue();
    const t  = fv['type'];
    switch (step) {
      case 0: if (!t) errs.push('Sélectionnez un type de planning'); break;
      case 1:
        if (t === 'individuel' && !fv['clientId'])              errs.push('Sélectionnez un client');
        if (t === 'groupe' && !fv['groupName'])                 errs.push('Entrez un nom de groupe');
        if (t === 'groupe' && this.selectedClients().length < 2)errs.push('Sélectionnez au moins 2 clients');
        if (t === 'zone' && !fv['quartier'])                    errs.push('Sélectionnez un quartier');
        if (t === 'secteur' && !fv['secteur'])                  errs.push('Sélectionnez un secteur');
        break;
      case 2:
        if (!fv['date'])      errs.push('Sélectionnez une date');
        if (!fv['startTime']) errs.push("Entrez l'heure de début");
        break;
      case 3: if (!this.selectedWasteTypes().length) errs.push('Sélectionnez au moins un type de déchet'); break;
      case 4: if (!this.selectedTeams().length)      errs.push('Affectez au moins une équipe'); break;
      case 6: if (!fv['libelle'])                    errs.push('Entrez un nom pour le planning'); break;
    }
    return errs;
  }

  // ---- Step 2 – Cible (individuel) ----
  searchClients(query: string): void {
    this.clientSearchQuery.set(query);
    if (!query.trim()) { this.filteredClients.set([]); return; }
    const q = query.toLowerCase();
    this.filteredClients.set(
      this.mockClients.filter(c => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q))
    );
  }

  selectClient(client: ClientOpt): void {
    this.form.patchValue({ clientId: client.id, clientName: client.name });
    this.selectedClients.set([client]);
    this.filteredClients.set([]);
    this.clientSearchQuery.set(client.name);
  }

  clearClient(): void {
    this.form.patchValue({ clientId: '', clientName: '' });
    this.selectedClients.set([]);
    this.clientSearchQuery.set('');
  }

  // ---- Step 2 – Cible (groupe) ----
  toggleGroupClient(client: ClientOpt): void {
    const cur = this.selectedClients();
    this.selectedClients.set(
      cur.some(c => c.id === client.id) ? cur.filter(c => c.id !== client.id) : [...cur, client]
    );
  }
  isClientSelected(id: string): boolean { return this.selectedClients().some(c => c.id === id); }

  // ---- Zone/Secteur selector output handler ----
  onZoneSelected(sel: ZoneSelection): void {
    this.form.patchValue({
      ville:          sel.ville          ?? '',
      arrondissement: sel.arrondissement ?? '',
      secteur:        sel.secteur        ?? '',
      quartier:       sel.quartier       ?? '',
    }, { emitEvent: true });
  }

  // ---- Step 2 – Zone hierarchy (kept for reference) ----
  get availableArrondissements(): string[] { return this.arrondissements[this.form.get('ville')?.value ?? ''] ?? []; }
  get availableSecteurs():        string[] { return this.secteurs[this.form.get('arrondissement')?.value ?? ''] ?? []; }
  get availableQuartiers():       string[] { return this.quartiers[this.form.get('secteur')?.value ?? ''] ?? []; }

  onVilleChange():         void { this.form.patchValue({ arrondissement: '', secteur: '', quartier: '' }); }
  onArrondissementChange():void { this.form.patchValue({ secteur: '', quartier: '' }); }
  onSecteurChange():       void { this.form.patchValue({ quartier: '' }); }

  // ---- Step 3 – Frequency days ----
  toggleFreqDay(day: string): void {
    const cur = this.frequencyDaysSel();
    const next = cur.includes(day) ? cur.filter(d => d !== day) : [...cur, day];
    this.frequencyDaysSel.set(next);
    this.form.get('frequencyDays')?.setValue(next);
  }
  isDaySelected(day: string): boolean { return this.frequencyDaysSel().includes(day); }

  // ---- Step 4 – Waste types ----
  toggleWasteType(id: string): void {
    const cur = this.selectedWasteTypes();
    const next = cur.includes(id) ? cur.filter(w => w !== id) : [...cur, id];
    this.selectedWasteTypes.set(next);
    this.form.get('wasteTypes')?.setValue(next);
  }
  isWasteTypeSelected(id: string): boolean { return this.selectedWasteTypes().includes(id); }

  // ---- Team conflict detector output ----
  onTeamsChange(ids: string[]): void {
    this.selectedTeams.set(ids);
    this.form.get('teams')?.setValue(ids);
  }

  // ---- Step 5 – Teams ----
  toggleTeam(id: string): void {
    const cur = this.selectedTeams();
    const next = cur.includes(id) ? cur.filter(t => t !== id) : [...cur, id];
    this.selectedTeams.set(next);
    this.form.get('teams')?.setValue(next);
  }
  isTeamSelected(id: string):     boolean { return this.selectedTeams().includes(id); }
  isTeamConflicting(id: string):  boolean { return this.conflictingTeamIds().includes(id); }

  // ---- Step 3 – Duration calc ----
  calculateEndTime(): void {
    const start = this.form.get('startTime')?.value as string;
    const h = this.estimatedHouseholds();
    const t = this.selectedTeams().length || 1;
    if (!start || !h) return;
    const [hh, mm] = start.split(':').map(Number);
    const endMin = hh * 60 + mm + Math.ceil((h * 5) / t);
    const eh = Math.floor(endMin / 60) % 24;
    const em = endMin % 60;
    this.form.get('endTime')?.setValue(`${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`);
  }

  // ---- Step 7 – Publication ----
  toggleField(field: string): void {
    this.form.get(field)?.setValue(!this.form.get(field)?.value);
  }

  useAutoName(): void {
    this.form.get('libelle')?.setValue(this.autoName());
  }

  // ---- Submit ----
  submitForm(): void {
    if (!this._isStepValid(6) || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    const v = this.form.value;
    const zoneStr = [v.ville, v.arrondissement, v.secteur, v.quartier].filter(Boolean).join(' / ') || undefined;

    this.svc.createPlanning({
      type:               v.type as PlanningType,
      libelle:            v.libelle,
      status:             v.publishImmediately ? 'publie' : 'brouillon',
      clientId:           v.clientId || undefined,
      clientName:         v.clientName || undefined,
      groupName:          v.groupName || undefined,
      ville:              v.ville || undefined,
      arrondissement:     v.arrondissement || undefined,
      secteur:            v.secteur || undefined,
      quartier:           v.quartier || undefined,
      zone:               zoneStr,
      date:               this._formatDateToStr(v.date),
      startTime:          v.startTime,
      endTime:            v.endTime || undefined,
      frequency:          v.frequency,
      wasteTypes:         this.selectedWasteTypes().map(id => this.wasteTypeOpts.find(w => w.id === id)?.label ?? id),
      teams:              this.selectedTeams().map(id => this._teamNameById(id)),
      clientsCount:       this.estimatedHouseholds(),
    }).subscribe({
      next: () => {
        localStorage.removeItem('planning_draft');
        this.msgSvc.add({ severity: 'success', summary: 'Succès', detail: 'Planning créé avec succès !' });
        setTimeout(() => this.router.navigate(['/planning/list']), 1500);
        this.isSubmitting.set(false);
      },
      error: () => {
        this.msgSvc.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de créer le planning' });
        this.isSubmitting.set(false);
      },
    });
  }

  clearDraft(): void {
    localStorage.removeItem('planning_draft');
    this.form.reset({ startTime: '08:00', frequency: 'unique', publishImmediately: true, notifyClients: true, notifyTeams: true });
    this.selectedWasteTypes.set([]);
    this.selectedTeams.set([]);
    this.selectedClients.set([]);
    this.frequencyDaysSel.set([]);
    this.currentStep.set(0);
  }

  // ---- Helpers ----
  formatDate(d: any): string {
    if (!d) return '—';
    const dt = d instanceof Date ? d : new Date(d);
    return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
  }

  private _formatDateToStr(d: any): string {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? '' : `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
  }

  private _teamNameById(id: string): string { return this.mockTeams.find(t => t.id === id)?.name ?? id; }

  getTypeOption(value: string)  { return this.planningTypes.find(t => t.value === value); }
  getWasteTypeLabel(id: string) { return this.wasteTypeOpts.find(w => w.id === id)?.label ?? id; }
  getTeamById(id: string)       { return this.mockTeams.find(t => t.id === id); }
  getFrequencyLabel(v: string)  { return this.frequencies.find(f => f.value === v)?.label ?? v; }

  joinLocation(parts: (string | null | undefined)[]): string {
    return parts.filter(v => !!v).join(' › ');
  }

  teamStatusLabel(s: string): string {
    return ({ disponible: 'Disponible', en_service: 'En service', indisponible: 'Indisponible' } as Record<string,string>)[s] ?? s;
  }
}
