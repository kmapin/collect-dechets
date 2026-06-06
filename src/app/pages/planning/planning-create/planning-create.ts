import { Component, OnInit, signal, computed, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { PlanningService } from '../services/planning.service';
import { PlanningType, WasteType, TeamApi, ConflictResult } from '../models/planning.model';
import { PlanningTypeSelectorComponent } from '../planning-type-selector/planning-type-selector';
import { ZoneSelectorComponent, ZoneSelection } from '../zone-selector/zone-selector';
import { TeamConflictDetectorComponent } from '../team-conflict-detector/team-conflict-detector';

// ── Local interfaces ────────────────────────────────────────────
interface StepDef {
  index: number;
  label: string;
  icon: string;
  description: string;
}

interface WasteTypeOpt {
  id: WasteType;
  label: string;
  icon: string;
  color: string;
  bg: string;
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
    SelectModule, DatePickerModule, ToastModule, TooltipModule, TagModule, SkeletonModule,
    PlanningTypeSelectorComponent,
    ZoneSelectorComponent,
    TeamConflictDetectorComponent,
  ],
  templateUrl: './planning-create.html',
  styleUrl: './planning-create.scss',
  providers: [MessageService],
})
export class PlanningCreate implements OnInit {
  private fb          = inject(FormBuilder);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);
  private svc         = inject(PlanningService);
  private msgSvc      = inject(MessageService);
  private destroyRef  = inject(DestroyRef);

  // ── State ────────────────────────────────────────────────────
  currentStep  = signal(0);
  draftSaved   = signal(false);
  isSubmitting = signal(false);
  isLoadingTeams   = signal(false);
  isLoadingClients = signal(false);

  // ── Edit mode ────────────────────────────────────────────────
  editId        = signal<string | null>(null);
  isEditMode    = computed(() => !!this.editId());
  isLoadingEdit = signal(false);

  // ── Duplicate mode ───────────────────────────────────────────
  duplicateId     = signal<string | null>(null);
  isDuplicateMode = computed(() => !!this.duplicateId());
  duplicateRef    = signal<string>('');

  readonly today = new Date();

  // ── Steps ────────────────────────────────────────────────────
  readonly steps: StepDef[] = [
    { index: 0, label: 'Type',        icon: 'category',       description: 'Type de planning' },
    { index: 1, label: 'Cible',       icon: 'location_on',    description: 'Sélection de la cible' },
    { index: 2, label: 'Calendrier',  icon: 'calendar_today', description: 'Paramètres temporels' },
    { index: 3, label: 'Déchets',     icon: 'delete_outline', description: 'Types de déchets' },
    { index: 4, label: 'Équipes',     icon: 'groups',         description: 'Affectation équipes' },
    { index: 5, label: 'Récap',       icon: 'summarize',      description: 'Récapitulatif' },
    { index: 6, label: 'Publication', icon: 'publish',        description: 'Publier le planning' },
  ];

  // ── Static options ───────────────────────────────────────────
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
    { value: 'lundi', label: 'Lun' }, { value: 'mardi', label: 'Mar' },
    { value: 'mercredi', label: 'Mer' }, { value: 'jeudi', label: 'Jeu' },
    { value: 'vendredi', label: 'Ven' }, { value: 'samedi', label: 'Sam' },
    { value: 'dimanche', label: 'Dim' },
  ];

  // ── API-loaded data ──────────────────────────────────────────
  apiTeams   = signal<TeamApi[]>([]);
  apiClients = signal<ClientOpt[]>([]);

  // ── Conflict check ────────────────────────────────────────────
  conflicts         = signal<ConflictResult[]>([]);
  checkingConflicts = signal(false);

  // ── Team operations (edit mode) ───────────────────────────────
  teamSaving   = signal(false);
  isPublishing = signal(false);

  // ── Selection signals ────────────────────────────────────────
  selectedWasteTypes = signal<WasteType[]>([]);
  selectedTeamId     = signal<string | null>(null);
  selectedClients    = signal<ClientOpt[]>([]);
  frequencyDaysSel   = signal<string[]>([]);
  filteredClients    = signal<ClientOpt[]>([]);
  clientSearchQuery  = signal('');

  // ── Form signal (for computed) ───────────────────────────────
  formValue = signal<Record<string, any>>({});

  // ── Form ─────────────────────────────────────────────────────
  form!: FormGroup;

  // ── Computed ─────────────────────────────────────────────────
  currentType = computed<string>(() => this.formValue()['type'] ?? '');

  estimatedHouseholds = computed<number>(() => {
    const fv   = this.formValue();
    const type = fv['type'] ?? '';
    if (type === 'individuel') return this.selectedClients().length > 0 ? 1 : 0;
    if (type === 'groupe')     return this.selectedClients().length;
    if (type === 'zone' || type === 'secteur') return 50;
    return 0;
  });

  estimatedDuration = computed<string>(() => {
    const h = this.estimatedHouseholds();
    if (!h) return '--';
    const totalMin = Math.ceil(h * 5);
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin % 60;
    return hh > 0 ? `${hh}h${String(mm).padStart(2, '0')}` : `${mm} min`;
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

  stepProgress = computed<number>(() => ((this.currentStep() + 1) / this.steps.length) * 100);
  canGoNext    = computed<boolean>(() => { this.formValue(); return this._isStepValid(this.currentStep()); });
  stepErrors   = computed<string[]>(() => { this.formValue(); return this._getStepErrors(this.currentStep()); });

  // Alias for template compatibility
  get mockClients() { return this.apiClients(); }

  conflictingTeamIds = computed<string[]>(() =>
    this.conflicts().map(c => c.equipeId)
  );

  availableTeamsToAdd = computed<TeamApi[]>(() =>
    this.apiTeams().filter(t => t._id !== this.selectedTeamId())
  );

  isTeamConflicting(id: string): boolean { return this.conflictingTeamIds().includes(id); }

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit(): void {
    this._initForm();
    this._syncFormValueSignal();
    this._setupAutoSave();
    this._watchTypeChange();
    this._loadTeams();
    this._loadClients();

    // Détection du mode édition / duplication via query params
    const editId      = this.route.snapshot.queryParamMap.get('edit');
    const duplicateId = this.route.snapshot.queryParamMap.get('duplicate');
    if (editId) {
      this.editId.set(editId);
      this._loadPlanningForEdit(editId);
    } else if (duplicateId) {
      this.duplicateId.set(duplicateId);
      this._loadPlanningForDuplicate(duplicateId);
    } else {
      this._loadDraft();
    }
  }

  private _loadPlanningForEdit(id: string): void {
    this.isLoadingEdit.set(true);
    this.svc.getPlanning(id).subscribe({
      next: planning => {
        // Remplir le formulaire avec les données existantes
        const date = planning.date ? new Date(planning.date) : null;
        this.form.patchValue({
          type:           planning.type,
          libelle:        planning.libelle,
          date,
          startTime:      planning.startTime ?? '08:00',
          endTime:        planning.endTime ?? '',
          frequency:      planning.frequency ?? 'unique',
          notes:          planning.notes ?? '',
          villeId:          planning.villeId ?? '',
          ville:            planning.ville ?? '',
          arrondissementId: planning.arrondissementId ?? '',
          arrondissement:   planning.arrondissement ?? '',
          secteurId:        planning.secteurId ?? '',
          secteur:          planning.secteur ?? '',
          quartierId:       planning.quartierId ?? '',
          quartier:         planning.quartier ?? '',
          clientId:         planning.clientId ?? '',
          groupName:        planning.groupeId ?? '',
          publishImmediately: false, // pas de publication auto en mode edit
        });
        // Remplir les signaux de sélection
        if (planning.typeDechets?.length) this.selectedWasteTypes.set(planning.typeDechets);
        this.selectedTeamId.set(planning.teamV2Id ?? planning.equipeIds?.[0] ?? null);
        // Aller à l'étape récap pour permettre la modification directe
        this.currentStep.set(5);
        this.isLoadingEdit.set(false);
      },
      error: () => {
        this.msgSvc.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger le planning' });
        this.isLoadingEdit.set(false);
        this.router.navigate(['/planning/dashboard']);
      },
    });
  }

  private _loadPlanningForDuplicate(id: string): void {
    this.isLoadingEdit.set(true);
    this.svc.getPlanning(id).subscribe({
      next: planning => {
        this.duplicateRef.set(planning.reference ?? '');

        // Décaler la date d'une semaine
        const originalDate = planning.date ? new Date(planning.date) : new Date();
        const nextDate = new Date(originalDate.getTime());
        nextDate.setDate(nextDate.getDate() + 7);

        this.form.patchValue({
          type:               planning.type,
          libelle:            '',
          date:               isNaN(nextDate.getTime()) ? null : nextDate,
          startTime:          planning.startTime ?? '08:00',
          endTime:            planning.endTime ?? '',
          frequency:          planning.frequency ?? 'unique',
          notes:              '',
          villeId:            planning.villeId ?? '',
          ville:              planning.ville ?? '',
          arrondissementId:   planning.arrondissementId ?? '',
          arrondissement:     planning.arrondissement ?? '',
          secteurId:          planning.secteurId ?? '',
          secteur:            planning.secteur ?? '',
          quartierId:         planning.quartierId ?? '',
          quartier:           planning.quartier ?? '',
          clientId:           planning.clientId ?? '',
          groupName:          planning.groupeId ?? '',
          publishImmediately: true,
          notifyClients:      true,
          notifyTeams:        true,
        });

        if (planning.typeDechets?.length) this.selectedWasteTypes.set(planning.typeDechets);
        this.selectedTeamId.set(planning.teamV2Id ?? planning.equipeIds?.[0] ?? null);

        // Afficher le récap pour que l'utilisateur puisse tout vérifier
        this.currentStep.set(5);
        this.isLoadingEdit.set(false);
      },
      error: () => {
        this.msgSvc.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger le planning à dupliquer' });
        this.isLoadingEdit.set(false);
        this.router.navigate(['/planning/dashboard']);
      },
    });
  }

  // ── API loaders ──────────────────────────────────────────────
  private _loadTeams(): void {
    this.isLoadingTeams.set(true);
    this.svc.getTeamsForAgency().subscribe({
      next:  teams => { this.apiTeams.set(teams); this.isLoadingTeams.set(false); },
      error: ()    => this.isLoadingTeams.set(false),
    });
  }

  private _loadClients(term?: string): void {
    this.isLoadingClients.set(true);
    this.svc.getClientsForAgency({ term, limit: 100 }).subscribe({
      next: clients => {
        this.apiClients.set(clients.map((c: any) => ({
          id:      c._id,
          name:    `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim(),
          address: [c.address?.neighborhood, c.address?.city].filter(Boolean).join(', '),
          zone:    c.address?.arrondissement ?? '',
          phone:   c.phone,
        })));
        this.isLoadingClients.set(false);
      },
      error: () => this.isLoadingClients.set(false),
    });
  }

  // ── Form init ────────────────────────────────────────────────
  private _initForm(): void {
    this.form = this.fb.group({
      type:                ['', Validators.required],
      clientId:            [''],
      clientName:          [''],
      groupName:           [''],
      ville:               [''], villeId:           [''],
      arrondissement:      [''], arrondissementId:  [''],
      secteur:             [''], secteurId:         [''],
      quartier:            [''], quartierId:        [''],
      date:                [null, Validators.required],
      startTime:           ['08:00', Validators.required],
      endTime:             [''],
      frequency:           ['unique', Validators.required],
      frequencyDays:       [[]],
      endDate:             [null],
      wasteTypes:          [[]],
      specialInstructions: [''],
      teams:               [[]],
      libelle:             ['', Validators.required],
      notes:               [''],
      publishImmediately:  [true],
      notifyClients:       [true],
      notifyTeams:         [true],
    });
  }

  private _loadDraft(): void {
    try {
      const raw = localStorage.getItem('planning_draft');
      if (!raw) return;
      const d = JSON.parse(raw);
      this.form.patchValue(d);
      if (d.wasteTypes?.length)    this.selectedWasteTypes.set(d.wasteTypes);
      if (d.teams?.length)         this.selectedTeamId.set(d.teams[0] ?? null);
      if (d.frequencyDays?.length) this.frequencyDaysSel.set(d.frequencyDays);
    } catch { /* ignore */ }
  }

  private _syncFormValueSignal(): void {
    this.form.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(v => this.formValue.set(v));
  }

  private _watchTypeChange(): void {
    this.form.get('type')?.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.form.patchValue({
        clientId: '', clientName: '', groupName: '',
        ville: '', villeId: '', arrondissement: '', arrondissementId: '',
        secteur: '', secteurId: '', quartier: '', quartierId: '',
      }, { emitEvent: false });
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

  // ── Step navigation ──────────────────────────────────────────
  nextStep(): void {
    if (this._isStepValid(this.currentStep()) && this.currentStep() < this.steps.length - 1) {
      this.currentStep.update(s => s + 1);
      if (this.currentStep() === 5) this.runConflictCheck();
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
  isStepActive(i: number):    boolean { return i === this.currentStep(); }

  private _isStepValid(step: number): boolean {
    const fv = this.formValue();
    switch (step) {
      case 0: return !!fv['type'];
      case 1: return this._validateTarget(fv);
      case 2: return !!fv['date'] && !!fv['startTime'];
      case 3: return this.selectedWasteTypes().length > 0;
      case 4: return !!this.selectedTeamId();
      case 5: return true;
      case 6: return !!fv['libelle'];
      default: return true;
    }
  }

  private _validateTarget(fv: Record<string, any>): boolean {
    const t = fv['type'];
    if (t === 'individuel') return !!fv['clientId'];
    if (t === 'groupe')     return !!fv['groupName'] && this.selectedClients().length >= 2;
    if (t === 'zone')       return !!(fv['quartierId'] || fv['secteurId']);
    if (t === 'secteur')    return !!fv['secteurId'];
    return false;
  }

  private _getStepErrors(step: number): string[] {
    const errs: string[] = [];
    const fv = this.formValue();
    const t  = fv['type'];
    switch (step) {
      case 0: if (!t) errs.push('Sélectionnez un type de planning'); break;
      case 1:
        if (t === 'individuel' && !fv['clientId'])               errs.push('Sélectionnez un client');
        if (t === 'groupe' && !fv['groupName'])                  errs.push('Entrez un nom de groupe');
        if (t === 'groupe' && this.selectedClients().length < 2) errs.push('Sélectionnez au moins 2 clients');
        if (t === 'zone' && !fv['quartierId'])                   errs.push('Sélectionnez un quartier');
        if (t === 'secteur' && !fv['secteurId'])                 errs.push('Sélectionnez un secteur');
        break;
      case 2:
        if (!fv['date'])      errs.push('Sélectionnez une date');
        if (!fv['startTime']) errs.push("Entrez l'heure de début");
        break;
      case 3: if (!this.selectedWasteTypes().length) errs.push('Sélectionnez au moins un type de déchet'); break;
      case 4: if (!this.selectedTeamId())            errs.push('Sélectionnez une équipe'); break;
      case 6: if (!fv['libelle'])                    errs.push('Entrez un nom pour le planning'); break;
    }
    return errs;
  }

  // ── Client search (individuel) ───────────────────────────────
  searchClients(query: string): void {
    this.clientSearchQuery.set(query);
    if (!query.trim()) { this.filteredClients.set([]); return; }
    const q = query.toLowerCase();
    this.filteredClients.set(
      this.apiClients().filter(c => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q))
    );
    // Also trigger API search if few local results
    if (this.filteredClients().length < 3) {
      this._loadClients(query);
    }
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

  // ── Group client selection ───────────────────────────────────
  toggleGroupClient(client: ClientOpt): void {
    const cur = this.selectedClients();
    this.selectedClients.set(
      cur.some(c => c.id === client.id) ? cur.filter(c => c.id !== client.id) : [...cur, client]
    );
  }
  isClientSelected(id: string): boolean { return this.selectedClients().some(c => c.id === id); }

  // ── Zone selector output ─────────────────────────────────────
  onZoneSelected(sel: ZoneSelection): void {
    this.form.patchValue({
      ville:           sel.ville          ?? '',
      villeId:         sel.villeId        ?? '',
      arrondissement:  sel.arrondissement ?? '',
      arrondissementId:sel.arrondissementId ?? '',
      secteur:         sel.secteur        ?? '',
      secteurId:       sel.secteurId      ?? '',
      quartier:        sel.quartier       ?? '',
      quartierId:      sel.quartierId     ?? '',
    }, { emitEvent: true });
  }

  // ── Frequency days ───────────────────────────────────────────
  toggleFreqDay(day: string): void {
    const cur  = this.frequencyDaysSel();
    const next = cur.includes(day) ? cur.filter(d => d !== day) : [...cur, day];
    this.frequencyDaysSel.set(next);
    this.form.get('frequencyDays')?.setValue(next);
  }
  isDaySelected(day: string): boolean { return this.frequencyDaysSel().includes(day); }

  // ── Waste types ──────────────────────────────────────────────
  toggleWasteType(id: WasteType): void {
    const cur  = this.selectedWasteTypes();
    const next = cur.includes(id) ? cur.filter(w => w !== id) : [...cur, id];
    this.selectedWasteTypes.set(next);
    this.form.get('wasteTypes')?.setValue(next);
  }
  isWasteTypeSelected(id: WasteType): boolean { return this.selectedWasteTypes().includes(id); }

  // ── Conflict check ────────────────────────────────────────────
  runConflictCheck(): void {
    const teamId  = this.selectedTeamId();
    const dateVal = this.formValue()['date'];
    if (!teamId || !dateVal) { this.conflicts.set([]); return; }
    this.checkingConflicts.set(true);
    this.svc.checkConflicts(
      this._dateToApiStr(dateVal), [teamId], this.editId() ?? undefined
    ).subscribe({
      next:  res => { this.conflicts.set(res.conflicts ?? []); this.checkingConflicts.set(false); },
      error: ()  => { this.conflicts.set([]);                  this.checkingConflicts.set(false); },
    });
  }

  // ── Team add / remove (persiste immédiatement en mode édition) ─
  addTeamChip(teamId: string): void {
    if (!teamId || this.teamSaving()) return;
    if (this.isEditMode()) {
      if (this.selectedTeamId() === teamId) return;
      this.teamSaving.set(true);
      const body = this._buildEditBody(teamId);
      this.svc.updatePlanning(this.editId()!, body).subscribe({
        next:  p   => { this.selectedTeamId.set(p.teamV2Id ?? null); this.teamSaving.set(false); },
        error: err => {
          this.msgSvc.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.message ?? err?.error?.error?.message ?? 'Impossible d\'ajouter l\'équipe' });
          this.teamSaving.set(false);
        },
      });
    } else {
      this.toggleTeam(teamId);
    }
  }

  removeTeamChip(): void {
    if (this.teamSaving()) return;
    if (this.isEditMode()) {
      this.teamSaving.set(true);
      const body = this._buildEditBody(null);
      this.svc.updatePlanning(this.editId()!, body).subscribe({
        next:  p   => { this.selectedTeamId.set(p.teamV2Id ?? null); this.teamSaving.set(false); },
        error: err => {
          this.msgSvc.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.message ?? err?.error?.error?.message ?? 'Impossible de retirer l\'équipe' });
          this.teamSaving.set(false);
        },
      });
    } else {
      this.selectedTeamId.set(null);
      this.form.get('teams')?.setValue([]);
    }
  }

  private _buildEditBody(teamV2Id: string | null): any {
    const v = this.form.getRawValue();
    const body: any = {
      type:        v.type,
      libelle:     v.libelle,
      frequency:   v.frequency,
      date:        this._dateToApiStr(v.date),
      startTime:   v.startTime,
      endTime:     v.endTime || undefined,
      typeDechets: this.selectedWasteTypes(),
      teamV2Id:    teamV2Id ?? undefined,
      notes:       v.notes || undefined,
    };
    if (v.clientId)          body.clientId          = v.clientId;
    if (v.groupName)         body.groupeId          = v.groupName;
    if (v.villeId)           body.villeId           = v.villeId;
    if (v.arrondissementId)  body.arrondissementId  = v.arrondissementId;
    if (v.secteurId)         body.secteurId         = v.secteurId;
    if (v.quartierId)        body.quartierId        = v.quartierId;
    return body;
  }

  // ── Publication directe (mode édition) ───────────────────────
  publishDraft(): void {
    if (this.isPublishing() || !this.editId()) return;
    this.isPublishing.set(true);
    this.svc.publishPlanning(this.editId()!).subscribe({
      next: () => {
        this.msgSvc.add({ severity: 'success', summary: 'Publié', detail: 'Planning publié avec succès' });
        this.isPublishing.set(false);
        setTimeout(() => this.router.navigate(['/planning/dashboard']), 1500);
      },
      error: err => {
        const detail = err?.error?.message ?? err?.error?.error?.message ?? 'Erreur lors de la publication';
        this.msgSvc.add({ severity: 'error', summary: 'Erreur de publication', detail });
        this.isPublishing.set(false);
      },
    });
  }

  // ── Team conflict detector output ────────────────────────────
  onTeamsChange(ids: string[]): void {
    const id = ids[0] ?? null;
    this.selectedTeamId.set(id);
    this.form.get('teams')?.setValue(id ? [id] : []);
  }

  toggleTeam(id: string): void {
    const next = this.selectedTeamId() === id ? null : id;
    this.selectedTeamId.set(next);
    this.form.get('teams')?.setValue(next ? [next] : []);
  }
  isTeamSelected(id: string): boolean { return this.selectedTeamId() === id; }

  // ── End time auto-calc ───────────────────────────────────────
  calculateEndTime(): void {
    const start = this.form.get('startTime')?.value as string;
    const h = this.estimatedHouseholds();
    if (!start || !h) return;
    const [hh, mm] = start.split(':').map(Number);
    const endMin   = hh * 60 + mm + Math.ceil(h * 5);
    const eh = Math.floor(endMin / 60) % 24;
    const em = endMin % 60;
    this.form.get('endTime')?.setValue(`${String(eh).padStart(2,'0')}:${String(em).padStart(2,'0')}`);
  }

  // ── Publication toggle ───────────────────────────────────────
  toggleField(field: string): void {
    this.form.get(field)?.setValue(!this.form.get(field)?.value);
  }

  useAutoName(): void {
    this.form.get('libelle')?.setValue(this.autoName());
  }

  // ── Submit ───────────────────────────────────────────────────
  submitForm(): void {
    if (!this._isStepValid(6) || this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const v         = this.form.value;
    const agencyId  = this.svc.agencyId;
    const managerId = this.svc.managerId;
    const dateStr   = this._dateToApiStr(v.date);

    const body: any = {
      type:        v.type as PlanningType,
      libelle:     v.libelle,
      frequency:   v.frequency,
      date:        dateStr,
      startTime:   v.startTime,
      endTime:     v.endTime || undefined,
      typeDechets: this.selectedWasteTypes(),
      teamV2Id:    this.selectedTeamId() ?? undefined,
      agencyId,
      managerId:   managerId || undefined,
      notes:       v.notes || undefined,
    };

    // Champs selon le type
    if (v.type === 'individuel') body.clientId = v.clientId;
    if (v.type === 'groupe')     body.groupeId = v.groupName;
    if (v.villeId)           body.villeId           = v.villeId;
    if (v.arrondissementId)  body.arrondissementId  = v.arrondissementId;
    if (v.secteurId)         body.secteurId          = v.secteurId;
    if (v.quartierId)        body.quartierId         = v.quartierId;

    if (this.isEditMode()) {
      // ── MODE ÉDITION ─────────────────────────────────────────
      this.svc.updatePlanning(this.editId()!, body).subscribe({
        next: (planning) => {
          this.msgSvc.add({ severity: 'success', summary: 'Modifié', detail: `Planning ${planning.reference} mis à jour !` });
          this.isSubmitting.set(false);
          setTimeout(() => this.router.navigate(['/planning/dashboard']), 1500);
        },
        error: (err) => {
          const msg = err?.error?.error?.message ?? 'Impossible de mettre à jour le planning';
          this.msgSvc.add({ severity: 'error', summary: 'Erreur', detail: msg });
          this.isSubmitting.set(false);
        },
      });
    } else {
      // ── MODE CRÉATION ────────────────────────────────────────
      this.svc.createPlanning(body).subscribe({
        next: (planning) => {
          localStorage.removeItem('planning_draft');
          this.msgSvc.add({ severity: 'success', summary: 'Succès', detail: `Planning ${planning.reference} créé !` });
          if (v.publishImmediately && planning.status === 'brouillon') {
            this.svc.publishPlanning(planning.id).subscribe({
              next:  () => setTimeout(() => this.router.navigate(['/planning/dashboard']), 1500),
              error: () => setTimeout(() => this.router.navigate(['/planning/dashboard']), 1500),
            });
          } else {
            setTimeout(() => this.router.navigate(['/planning/dashboard']), 1500);
          }
          this.isSubmitting.set(false);
        },
        error: (err) => {
          const msg = err?.error?.error?.message ?? 'Impossible de créer le planning';
          this.msgSvc.add({ severity: 'error', summary: 'Erreur', detail: msg });
          this.isSubmitting.set(false);
        },
      });
    }
  }

  clearDraft(): void {
    localStorage.removeItem('planning_draft');
    this.form.reset({ startTime: '08:00', frequency: 'unique', publishImmediately: true, notifyClients: true, notifyTeams: true });
    this.selectedWasteTypes.set([]);
    this.selectedTeamId.set(null);
    this.selectedClients.set([]);
    this.frequencyDaysSel.set([]);
    this.currentStep.set(0);
  }

  // ── UI helpers ───────────────────────────────────────────────
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

  // API expects YYYY-MM-DD
  private _dateToApiStr(d: any): string {
    if (!d) return '';
    const dt = d instanceof Date ? d : new Date(d);
    return isNaN(dt.getTime()) ? '' :
      `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }

  getTypeOption(value: string)   { return this.planningTypes.find(t => t.value === value); }
  getWasteTypeLabel(id: string)  { return this.wasteTypeOpts.find(w => w.id === id)?.label ?? id; }
  getTeamById(id: string)        { return this.apiTeams().find(t => t._id === id); }
  getFrequencyLabel(v: string)   { return this.frequencies.find(f => f.value === v)?.label ?? v; }

  joinLocation(parts: (string | null | undefined)[]): string {
    return parts.filter(v => !!v).join(' › ');
  }

  teamStatusLabel(s: string): string {
    return ({ active: 'Disponible', inactive: 'Indisponible' } as Record<string,string>)[s] ?? s;
  }

  teamStatusColor(s: string): string {
    return ({ active: '#16a34a', inactive: '#ef4444' } as Record<string,string>)[s] ?? '#64748b';
  }
}
