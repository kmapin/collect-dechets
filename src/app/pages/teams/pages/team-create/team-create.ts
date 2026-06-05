import {
  Component, inject, signal, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  ReactiveFormsModule, FormBuilder, Validators, FormArray, AbstractControl,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TeamService } from '../../services/team.service';
import { MemberRole, TeamStatus, TeamMember } from '../../models/team.model';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface CandidateMember { id: string; name: string; phone: string; role: MemberRole; label: string; }

// ── Constants ─────────────────────────────────────────────────────────────────
const TEAM_COLORS = [
  '#3b82f6','#16a34a','#f59e0b','#ef4444','#8b5cf6',
  '#06b6d4','#ec4899','#d97706','#64748b','#0f172a',
];

const CANDIDATE_STAFF: CandidateMember[] = [
  { id: 'CS01', name: 'Boureima Ouédraogo', phone: '+226 70 10 20 30', role: 'collector', label: 'Collecteur' },
  { id: 'CS02', name: 'Salimata Nana',      phone: '+226 70 10 20 31', role: 'manager',   label: 'Manager'    },
  { id: 'CS03', name: 'Arouna Diallo',      phone: '+226 70 10 20 32', role: 'collector', label: 'Collecteur' },
  { id: 'CS04', name: 'Clarisse Ouattara',  phone: '+226 70 10 20 33', role: 'manager',   label: 'Manager'    },
  { id: 'CS05', name: 'Emmanuel Kaboré',    phone: '+226 70 10 20 34', role: 'collector', label: 'Collecteur' },
  { id: 'CS06', name: 'Fatoumata Traoré',   phone: '+226 70 10 20 35', role: 'collector', label: 'Collecteur' },
  { id: 'CS07', name: 'Georges Sawadogo',   phone: '+226 70 10 20 36', role: 'collector', label: 'Collecteur' },
  { id: 'CS08', name: 'Hawa Konaté',        phone: '+226 70 10 20 37', role: 'collector', label: 'Collecteur' },
  { id: 'CS09', name: 'Ibrahim Compaoré',   phone: '+226 70 10 20 38', role: 'collector', label: 'Collecteur' },
  { id: 'CS10', name: 'Judith Yameogo',     phone: '+226 70 10 20 39', role: 'collector', label: 'Collecteur' },
];

const WORK_DAYS = [
  { key: 'lun', label: 'Lun' }, { key: 'mar', label: 'Mar' },
  { key: 'mer', label: 'Mer' }, { key: 'jeu', label: 'Jeu' },
  { key: 'ven', label: 'Ven' }, { key: 'sam', label: 'Sam' },
  { key: 'dim', label: 'Dim' },
];

const STEPS = [
  { key: 0, label: 'Infos de base',   icon: 'info'          },
  { key: 1, label: 'Véhicule & Zone', icon: 'local_shipping' },
  { key: 2, label: 'Membres',         icon: 'group'          },
  { key: 3, label: 'Aperçu',          icon: 'preview'        },
];

const DRAFT_KEY = 'sahelys-team-create-draft';

@Component({
  selector: 'app-team-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, ToastModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './team-create.html',
  styleUrl: './team-create.scss',
})
export class TeamCreate {
  private fb      = inject(FormBuilder);
  private router  = inject(Router);
  readonly svc    = inject(TeamService);
  private msg     = inject(MessageService);

  // ── Constants exposed to template ────────────────────────────
  readonly steps       = STEPS;
  readonly teamColors  = TEAM_COLORS;
  readonly workDayList = WORK_DAYS;

  // Candidates loaded from API (falls back to static list if empty)
  apiCandidates = signal<CandidateMember[]>(CANDIDATE_STAFF);

  get candidates() { return this.apiCandidates(); }
  readonly roles: { value: MemberRole; label: string; icon: string }[] = [
    { value: 'manager',   label: 'Manager',    icon: 'manage_accounts' },
    { value: 'collector', label: 'Collecteur', icon: 'recycling'       },
  ];

  // ── UI Signals ───────────────────────────────────────────────
  currentStep          = signal(0);
  photoPreview         = signal<string | null>(null);
  memberSearch         = signal('');
  zoneSearch           = signal('');
  isDragOver           = signal(false);
  saving               = signal(false);
  autosaveStatus       = signal<'idle' | 'saving' | 'saved'>('idle');
  hasDraft             = signal(!!localStorage.getItem(DRAFT_KEY));
  selectedCandidateIds = signal<string[]>([]);

  // ── Form ─────────────────────────────────────────────────────
  form = this.fb.group({
    // Step 1
    name:        ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    code:        ['', [Validators.required, Validators.pattern(/^[A-Z]{1,4}-\d{2,4}$/)]],
    supervisor:  ['', Validators.required],
    phone:       [''],
    status:      ['active' as TeamStatus, Validators.required],
    color:       [TEAM_COLORS[0]],
    description: [''],
    // Step 2
    vehicleId: [''],
    zoneIds:   [[] as string[]],
    // Step 3
    members:     this.fb.array<ReturnType<TeamCreate['_memberGroup']>>([]),
    maxCapacity: [8, [Validators.required, Validators.min(1), Validators.max(30)]],
    workDays:    [['lun', 'mar', 'mer', 'jeu', 'ven'] as string[]],
    startTime:   ['06:00'],
    endTime:     ['14:00'],
    // Step 4
    notes: [''],
  });

  get membersArray(): FormArray { return this.form.get('members') as FormArray; }

  // ── Computed ─────────────────────────────────────────────────
  vehicleConflict = computed(() => {
    const vid = this.form.get('vehicleId')?.value;
    if (!vid) return null;
    const v = this.svc.availableVehicles().find(x => x.id === vid);
    if (!v) return null;
    if (v.status === 'maintenance')  return `${v.plate} est en maintenance`;
    if (v.status === 'hors_service') return `${v.plate} est hors service`;
    if (v.status === 'en_service')   return `${v.plate} est déjà en service`;
    return null;
  });

  selectedVehicle = computed(() => {
    const vid = this.form.get('vehicleId')?.value;
    return this.svc.availableVehicles().find(v => v.id === vid) ?? null;
  });

  filteredCandidates = computed(() => {
    const q = this.memberSearch().toLowerCase();
    if (!q) return this.candidates;
    return this.candidates.filter(c =>
      c.name.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)
    );
  });

  filteredZones = computed(() => {
    const q = this.zoneSearch().toLowerCase();
    if (!q) return this.svc.availableZones();
    return this.svc.availableZones().filter(z =>
      z.name.toLowerCase().includes(q) || z.ville.toLowerCase().includes(q)
    );
  });

  selectedZones = computed(() => {
    const ids = (this.form.get('zoneIds')?.value ?? []) as string[];
    return this.svc.availableZones().filter(z => ids.includes(z.id));
  });

  stepValidity = computed(() => [
    this.form.get('name')!.valid && this.form.get('code')!.valid && this.form.get('supervisor')!.valid,
    true,
    this.membersArray.length > 0,
    true,
  ]);

  constructor() {
    // Load real collectors from API for step 3 member selection
    this.svc.loadCollectors();
    // Load vehicles and zones from API for step 2
    this.svc.loadAvailableVehiclesFromApi();
    this.svc.loadAvailableZonesFromApi();
    // Watch for collectors from the service and map to CandidateMember
    // We read the signal in an effect-like manner via the template's computed
    this._syncCandidatesFromApi();

    // Autosave on form changes
    this.form.valueChanges.pipe(
      debounceTime(1500),
      takeUntilDestroyed(),
    ).subscribe(() => {
      this.autosaveStatus.set('saving');
      localStorage.setItem(DRAFT_KEY, JSON.stringify(this.form.getRawValue()));
      setTimeout(() => this.autosaveStatus.set('saved'), 400);
    });
  }

  // ── Draft ────────────────────────────────────────────────────
  loadDraft(): void {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const { members, ...rest } = data;
      this.form.patchValue(rest);
      this.membersArray.clear();
      if (Array.isArray(members)) {
        members.forEach((m: any) => this.membersArray.push(this._memberGroup(m._id, m.name, m.phone, m.role)));
      }
      this.hasDraft.set(false);
      this.msg.add({ severity: 'info', summary: 'Brouillon restauré', detail: 'Formulaire chargé depuis la sauvegarde' });
    } catch { /* ignore corrupt draft */ }
  }

  discardDraft(): void {
    localStorage.removeItem(DRAFT_KEY);
    this.hasDraft.set(false);
  }

  // ── Step navigation ──────────────────────────────────────────
  isStepComplete(i: number): boolean { return this.stepValidity()[i]; }

  goToStep(i: number): void {
    if (i < this.currentStep() || this.isStepComplete(this.currentStep())) {
      this.currentStep.set(i);
    }
  }
  nextStep(): void {
    if (this.currentStep() >= this.steps.length - 1) return;
    if (!this.isStepComplete(this.currentStep())) {
      this.form.markAllAsTouched();
      return;
    }
    this.currentStep.update(s => s + 1);
  }
  prevStep(): void { if (this.currentStep() > 0) this.currentStep.update(s => s - 1); }

  // ── Photo upload ─────────────────────────────────────────────
  onPhotoInput(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this._readPhoto(file);
  }
  onDragOver(e: DragEvent): void { e.preventDefault(); this.isDragOver.set(true); }
  onDragLeave(): void { this.isDragOver.set(false); }
  onDrop(e: DragEvent): void {
    e.preventDefault(); this.isDragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file?.type.startsWith('image/')) this._readPhoto(file);
  }
  private _readPhoto(file: File): void {
    const reader = new FileReader();
    reader.onload = ev => this.photoPreview.set(ev.target?.result as string);
    reader.readAsDataURL(file);
  }
  removePhoto(): void { this.photoPreview.set(null); }

  // ── Code generation ──────────────────────────────────────────
  generateCode(): void {
    const name = (this.form.get('name')?.value ?? '').trim();
    if (!name) return;
    const prefix = name.split(/\s+/)
      .map(w => w[0]?.toUpperCase() ?? '')
      .join('')
      .replace(/[^A-Z]/g, '')
      .slice(0, 3) || 'EQ';
    const n = this.svc.teams().length + 1;
    this.form.get('code')!.setValue(`${prefix}-${String(n).padStart(3, '0')}`);
  }

  // ── Vehicle & Zone ───────────────────────────────────────────
  toggleZone(id: string): void {
    const ids = [...((this.form.get('zoneIds')?.value ?? []) as string[])];
    const idx = ids.indexOf(id);
    if (idx >= 0) ids.splice(idx, 1); else ids.push(id);
    this.form.get('zoneIds')!.setValue(ids);
  }
  isZoneSelected(id: string): boolean {
    return ((this.form.get('zoneIds')?.value ?? []) as string[]).includes(id);
  }

  // ── Members ──────────────────────────────────────────────────
  toggleCandidate(c: CandidateMember): void {
    if (this.selectedCandidateIds().includes(c.id)) {
      this.selectedCandidateIds.update(l => l.filter(id => id !== c.id));
      const idx = this.membersArray.controls
        .findIndex(ctrl => ctrl.get('_id')?.value === c.id);
      if (idx >= 0) this.membersArray.removeAt(idx);
    } else {
      this.selectedCandidateIds.update(l => [...l, c.id]);
      this.membersArray.push(this._memberGroup(c.id, c.name, c.phone, c.role));
    }
  }
  isCandidateSelected(id: string): boolean { return this.selectedCandidateIds().includes(id); }

  addCustomMember(): void { this.membersArray.push(this._memberGroup()); }

  removeMember(i: number): void {
    const id = this.membersArray.at(i).get('_id')?.value;
    if (id) this.selectedCandidateIds.update(l => l.filter(x => x !== id));
    this.membersArray.removeAt(i);
  }

  private _memberGroup(id = '', name = '', phone = '', role: MemberRole = 'collector') {
    return this.fb.group({
      _id:   [id],
      name:  [name,  Validators.required],
      phone: [phone],
      role:  [role,  Validators.required],
    });
  }

  // ── Schedule ─────────────────────────────────────────────────
  toggleWorkDay(day: string): void {
    const days = [...((this.form.get('workDays')?.value ?? []) as string[])];
    const idx = days.indexOf(day);
    if (idx >= 0) days.splice(idx, 1); else days.push(day);
    this.form.get('workDays')!.setValue(days);
  }
  isDaySelected(day: string): boolean {
    return ((this.form.get('workDays')?.value ?? []) as string[]).includes(day);
  }

  // ── Capacity stepper ─────────────────────────────────────────
  decCapacity(): void {
    const v = this.form.get('maxCapacity')!.value ?? 1;
    this.form.get('maxCapacity')!.setValue(Math.max(1, (v as number) - 1));
  }
  incCapacity(): void {
    const v = this.form.get('maxCapacity')!.value ?? 1;
    this.form.get('maxCapacity')!.setValue(Math.min(30, (v as number) + 1));
  }

  // ── Helpers ──────────────────────────────────────────────────
  vehicleTypeIcon(type: string): string {
    return ({ camion: 'local_shipping', pickup: 'directions_car', moto: 'two_wheeler', tricycle: 'electric_rickshaw' } as Record<string,string>)[type] ?? 'local_shipping';
  }
  vehicleStatusColor(s: string): string {
    return ({ disponible: '#16a34a', en_service: '#f59e0b', maintenance: '#ef4444', hors_service: '#94a3b8' } as Record<string,string>)[s] ?? '#64748b';
  }
  vehicleStatusLabel(s: string): string {
    return ({ disponible: 'Disponible', en_service: 'En service', maintenance: 'Maintenance', hors_service: 'Hors service' } as Record<string,string>)[s] ?? s;
  }
  roleLabel(r: string): string { return this.roles.find(x => x.value === r)?.label ?? r; }

  hasError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }
  memberHasError(i: number, field: string): boolean {
    const c = this.membersArray.at(i).get(field);
    return !!(c?.invalid && c?.touched);
  }
  memberCtrl(i: number): AbstractControl { return this.membersArray.at(i); }

  get selectedWorkDays(): string {
    return ((this.form.get('workDays')?.value ?? []) as string[]).join(', ');
  }

  // ── Submit ───────────────────────────────────────────────────
  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const raw = this.form.getRawValue();

    const vehicle = raw.vehicleId
      ? this.svc.availableVehicles().find(v => v.id === raw.vehicleId)
      : undefined;
    const zones = (raw.zoneIds as string[])
      .map(id => this.svc.availableZones().find(z => z.id === id))
      .filter(Boolean) as any[];

    const members: TeamMember[] = (raw.members as any[]).map((m, i) => ({
      id:           m._id && !m._id.startsWith('LOCAL-') && !m._id.startsWith('NEW-')
                      ? m._id : `LOCAL-${Date.now()}-${i}`,
      name:         m.name,
      phone:        m.phone || '—',
      role:         m.role,
      availability: 'disponible' as const,
      joinedAt:     new Date().toISOString().split('T')[0],
    }));

    this.svc.createV2({
      name:        raw.name ?? '',
      status:      (raw.status ?? 'active') as TeamStatus,
      color:       raw.color ?? '#3b82f6',
      description: raw.description ?? '',
      supervisor:  raw.supervisor ?? '',
      phone:       raw.phone ?? '',
      members,
      zones,
      vehicle: vehicle
        ? { ...vehicle, lastMaintenance: '—', fuelLevel: 80, mileage: 0 }
        : undefined,
    }).subscribe({
      next: team => {
        this.saving.set(false);
        localStorage.removeItem(DRAFT_KEY);
        this.msg.add({ severity: 'success', summary: 'Équipe créée !', detail: `${team.name} a été créée avec succès.` });
        setTimeout(() => this.router.navigate(['/teams/detail', team.id]), 1400);
      },
      error: err => {
        this.saving.set(false);
        const detail = err?.error?.message ?? 'Impossible de créer l\'équipe';
        this.msg.add({ severity: 'error', summary: 'Erreur', detail });
      },
    });
  }

  cancel(): void { this.router.navigate(['/teams/list']); }

  // ── Private ─────────────────────────────────────────────────
  private _syncCandidatesFromApi(): void {
    // Poll once after a short delay to let the API response arrive
    setTimeout(() => {
      const apiCollectors = this.svc.collectors();
      if (apiCollectors.length > 0) {
        this.apiCandidates.set(
          apiCollectors.map(c => ({
            id:    c._id,
            name:  `${c.firstName} ${c.lastName}`.trim(),
            phone: c.phone ?? '',
            role:  'collector' as MemberRole,
            label: 'Collecteur',
          }))
        );
      }
    }, 1500);
  }
}
