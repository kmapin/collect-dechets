import { Component, EventEmitter, Output, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FINANCE_DATA_SERVICE } from '../../../data-access/tokens/finance-data.token';
import { FeeOptionRetrait, OperateurRetrait } from '../../../data-access/contracts/finance-data.service';
import { formatMontantXof } from '../../../utils/money.util';
import { FeeConfigService } from '../../../../../../services/fee-config.service';
import { ScrollLockDirective } from '../../../../../../shared/scroll-lock.directive';
import { PhoneInputDirective } from '../../../../../../shared/phone-input.directive';
import { operateurMsisdnCrossValidator } from '../../../../../../shared/operator-msisdn.util';

type Etape = 'formulaire' | 'confirmation';

interface OperateurInfo {
  value: OperateurRetrait;
  label: string;
  disponible: boolean;
  color: string;
  image: string;
}

// Formulaire de création d'un retrait 
@Component({
  selector: 'app-create-withdrawal-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, ScrollLockDirective, PhoneInputDirective],
  templateUrl: './create-withdrawal-dialog.component.html',
  styleUrl: './create-withdrawal-dialog.component.scss',
})
export class CreateWithdrawalDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly financeData = inject(FINANCE_DATA_SERVICE);
  private readonly feeConfigService = inject(FeeConfigService);

  
  @Output() ferme = new EventEmitter<boolean>();

  // Mêmes libellés/couleurs/logos que mobile-money-form.ts (page de paiement d'un
  // abonnement) — cartes cliquables plutôt qu'un <select>, pour une saisie uniforme
  // partout où un opérateur mobile money est choisi dans l'appli.
  readonly operateurs: OperateurInfo[] = [
    { value: 'ORANGE_MONEY', label: 'Orange Money', disponible: true, color: '#FF7900', image: 'assets/logoMobileMoney/Orange_Money-Logo.png' },
    { value: 'MOOV_MONEY', label: 'Moov Money', disponible: true, color: '#009DDC', image: 'assets/logoMobileMoney/logo_moov_money.webp' },
    { value: 'TELECEL_MONEY', label: 'Telecel Money', disponible: true, color: '#00D9A5', image: 'assets/logoMobileMoney/telecel1024X500.jpg' },
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
    // Défaut 'A' (frais déduits du montant reçu) plutôt que null : un toggle a toujours un
    // état visible, contrairement aux 2 radios qu'il remplace (qui, elles, démarraient
    // sans sélection — Validators.required forçait un choix explicite avant validation).
    feeOption: this.fb.control<FeeOptionRetrait | null>('A', Validators.required),
  }, { validators: operateurMsisdnCrossValidator('operator', 'customerMsisdn') });

  
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

  // Toggle "Inclure les frais de plateforme" — correspondance propre avec feeOption
  // ('A'|'B'), seul contrat conservé côté modèle/API (voir FeeOptionRetrait) :
  // activé = Option B (frais ajoutés au débit, le bénéficiaire reçoit le montant demandé
  // en entier) ; désactivé = Option A (frais déduits du montant reçu).
  get inclureFraisPlateforme(): boolean {
    return this.form.controls.feeOption.value === 'B';
  }

  basculerInclureFraisPlateforme(): void {
    const control = this.form.controls.feeOption;
    control.setValue(this.inclureFraisPlateforme ? 'A' : 'B');
    control.markAsTouched();
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
    if (champ.errors['operatorMismatch']) return champ.errors['operatorMismatch'];
    if (champ.errors['min']) return 'Le montant doit être supérieur à 0';
    if (champ.errors['maxlength']) return `Maximum ${champ.errors['maxlength'].requiredLength} caractères`;
    return 'Valeur invalide';
  }
}
