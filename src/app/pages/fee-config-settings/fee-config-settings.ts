import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import { FeeBlock, FeeConfigData, FeeConfigService, FeeType } from '../../services/fee-config.service';

type FeeBlockKey = 'clientPaymentFee' | 'agencyWithdrawalFee';

const DEFAULT_BLOCK: FeeBlock = { enabled: false, type: 'PERCENTAGE', value: 0 };

/**
 * DÉCISION MÉTIER — GESTION DES FRAIS PLATEFORME (Prompt F8/9, écran 1) — configure
 * CLIENT_PAYMENT_FEE et AGENCY_WITHDRAWAL_FEE (enabled/type/value), plateforme-wide
 * (V1, décision Checkpoint), super_admin uniquement (route gardée par
 * fee-config-admin.guard.ts). Validation client-side EN PLUS de celle du backend
 * (services/feeConfig.js::validateFeeBlock), jamais à sa place — le backend
 * revalide systématiquement, ce formulaire n'est qu'un confort utilisateur.
 */
@Component({
  selector: 'app-fee-config-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fee-config-settings.html',
  styleUrl: './fee-config-settings.scss',
})
export class FeeConfigSettingsComponent implements OnInit {
  isLoading = true;
  isSaving = false;

  clientPaymentFee: FeeBlock = { ...DEFAULT_BLOCK };
  agencyWithdrawalFee: FeeBlock = { ...DEFAULT_BLOCK };

  readonly feeTypes: { value: FeeType; label: string }[] = [
    { value: 'PERCENTAGE', label: 'Pourcentage (%)' },
    { value: 'FIXED', label: 'Montant fixe (FCFA)' },
  ];

  constructor(
    private readonly feeConfigService: FeeConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.isLoading = true;
    this.feeConfigService.getGlobal$().subscribe({
      next: (res) => {
        const data = res?.data;
        if (data) {
          this.clientPaymentFee = { ...DEFAULT_BLOCK, ...data.clientPaymentFee };
          this.agencyWithdrawalFee = { ...DEFAULT_BLOCK, ...data.agencyWithdrawalFee };
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.notificationService.showError('Erreur', 'Impossible de charger la configuration des frais plateforme.');
      },
    });
  }

  /**
   * Validation client-side (Règle explicite du Prompt F8 : "en plus de celle déjà
   * faite côté backend") — mêmes règles que services/feeConfig.js::validateFeeBlock :
   * un bloc désactivé n'a aucune contrainte sur `value` (comportement neutre côté
   * FeeService, voir Prompt F3), pas la peine de bloquer sa sauvegarde.
   */
  blockError(key: FeeBlockKey): string | null {
    const block = this[key];
    if (!block.enabled) return null;
    if (block.value === null || block.value === undefined || Number.isNaN(block.value)) {
      return 'Une valeur est requise pour un frais activé.';
    }
    if (block.value < 0) {
      return 'La valeur ne peut pas être négative.';
    }
    if (block.type === 'PERCENTAGE' && block.value > 100) {
      return 'Un pourcentage ne peut pas dépasser 100.';
    }
    return null;
  }

  get hasErrors(): boolean {
    return !!this.blockError('clientPaymentFee') || !!this.blockError('agencyWithdrawalFee');
  }

  save(): void {
    if (this.hasErrors || this.isSaving) return;

    this.isSaving = true;
    const payload: Partial<FeeConfigData> = {
      clientPaymentFee: this.clientPaymentFee,
      agencyWithdrawalFee: this.agencyWithdrawalFee,
    };

    this.feeConfigService.updateGlobal$(payload).subscribe({
      next: (res) => {
        this.isSaving = false;
        const data = res?.data;
        if (data) {
          this.clientPaymentFee = { ...DEFAULT_BLOCK, ...data.clientPaymentFee };
          this.agencyWithdrawalFee = { ...DEFAULT_BLOCK, ...data.agencyWithdrawalFee };
        }
        this.notificationService.showSuccess('Configuration enregistrée', 'Les frais plateforme ont été mis à jour.');
      },
      error: (err) => {
        this.isSaving = false;
        const message = err?.error?.message || 'Impossible d’enregistrer la configuration pour le moment.';
        this.notificationService.showError('Erreur', message);
      },
    });
  }
}
