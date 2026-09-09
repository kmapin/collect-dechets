import { Component, EventEmitter, Output, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FINANCE_DATA_SERVICE } from '../../data-access/tokens/finance-data.token';
import { FeeOptionRetrait, OperateurRetrait } from '../../data-access/contracts/finance-data.service';
import { formatMontantXof } from '../../utils/money.util';
import { FeeConfigService } from '../../../../../services/fee-config.service';

type Etape = 'formulaire' | 'confirmation';

interface OperateurInfo {
  value: OperateurRetrait;
  label: string;
  disponible: boolean;
}

// Formulaire de création d'un retrait 
@Component({
  selector: 'app-create-withdrawal-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './create-withdrawal-dialog.component.html',
  styleUrl: './create-withdrawal-dialog.component.scss',
})
export class CreateWithdrawalDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly financeData = inject(FINANCE_DATA_SERVICE);
  private readonly feeConfigService = inject(FeeConfigService);

  
  @Output() ferme = new EventEmitter<boolean>();

  readonly operateurs: OperateurInfo[] = [
    { value: 'MOOV_MONEY', label: 'Moov Money', disponible: true },
    { value: 'ORANGE_MONEY', label: 'Orange Money', disponible: true },
  ];

  readonly etape = signal<Etape>('formulaire');
  readonly enregistrement = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly formatMontant = formatMontantXof;

  // Frais plateforme
  private readonly agencyWithdrawalFee = signal<{ enabled: boolean; type: 'FIXED' | 'PERCENTAGE'; value: number } | null>(null);

  readonly form = this.fb.nonNullable.group({
    operator: this.fb.control<OperateurRetrait | null>(null, Validators.required),
    customerMsisdn: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    montant: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    motif: ['', Validators.maxLength(200)],
    feeOption: this.fb.control<FeeOptionRetrait | null>(null, Validators.required),
  });

  
  private readonly montantSignal = toSignal(this.form.controls.montant.valueChanges, {
    initialValue: this.form.controls.montant.value,
  });

  constructor() {
    this.feeConfigService.getGlobal$().subscribe({
      next: (res) => {
        const fee = res?.data?.agencyWithdrawalFee ?? null;
        this.agencyWithdrawalFee.set(fee);
        if (!fee?.enabled) this.form.controls.feeOption.setValue('A');
      },
      error: () => this.agencyWithdrawalFee.set(null),
    });
  }

  get operatorLabel(): string {
    return this.operateurs.find(o => o.value === this.form.value.operator)?.label ?? '';
  }

  private computeFeeAmount(montant: number): number {
    const fee = this.agencyWithdrawalFee();
    if (!fee || !fee.enabled) return 0;
    return fee.type === 'PERCENTAGE' ? Math.round((montant * fee.value) / 100) : fee.value;
  }

  /** Aperçu Option A (déduit du montant reçu)*/
  readonly apercuOptionA = computed(() => {
    const montant = this.montantSignal();
    if (!montant || montant <= 0) return null;
    const fee = this.computeFeeAmount(montant);
    return { feeAmount: fee, netAmountReceived: montant - fee, walletDebitAmount: montant };
  });

  /** Aperçu Option B (agence prend les frais en plus du débit). */
  readonly apercuOptionB = computed(() => {
    const montant = this.montantSignal();
    if (!montant || montant <= 0) return null;
    const fee = this.computeFeeAmount(montant);
    return { feeAmount: fee, netAmountReceived: montant, walletDebitAmount: montant + fee };
  });

  get fraisActifs(): boolean {
    return !!this.agencyWithdrawalFee()?.enabled;
  }

  passerAConfirmation(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.etape.set('confirmation');
  }

  retourFormulaire(): void {
    this.etape.set('formulaire');
  }

  annuler(): void {
    this.ferme.emit(false);
  }

  confirmer(): void {
    if (this.form.invalid || this.enregistrement()) return;
    const { operator, customerMsisdn, montant, motif, feeOption } = this.form.getRawValue();
    if (!operator || !customerMsisdn || !montant || !feeOption) return;

    this.enregistrement.set(true);
    this.erreur.set(null);

    this.financeData.enregistrerRetrait({ montant, customerMsisdn, operator, motif: motif || undefined, feeOption }).subscribe({
      next: () => {
        this.enregistrement.set(false);
        this.ferme.emit(true);
      },
      error: (err: HttpErrorResponse) => {
        this.enregistrement.set(false);
        this.erreur.set(err.error?.message ?? "Impossible d'enregistrer ce retrait pour le moment.");
      },
    });
  }

  messageErreur(controle: 'operator' | 'customerMsisdn' | 'montant' | 'motif' | 'feeOption'): string {
    const champ = this.form.get(controle);
    if (!champ || !champ.errors || !champ.touched) return '';
    if (champ.errors['required']) return 'Ce champ est obligatoire';
    if (champ.errors['pattern']) return 'Numéro invalide (8 chiffres attendus)';
    if (champ.errors['min']) return 'Le montant doit être supérieur à 0';
    if (champ.errors['maxlength']) return `Maximum ${champ.errors['maxlength'].requiredLength} caractères`;
    return 'Valeur invalide';
  }
}
