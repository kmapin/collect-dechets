import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FINANCE_DATA_SERVICE } from '../../data-access/tokens/finance-data.token';
import { OperateurRetrait } from '../../data-access/contracts/finance-data.service';
import { formatMontantXof } from '../../utils/money.util';

type Etape = 'formulaire' | 'confirmation';

interface OperateurInfo {
  value: OperateurRetrait;
  label: string;
  disponible: boolean;
}

// Formulaire de création d'un retrait (F4) — POST /finance/retraits, réellement branché sur
// le backend (débit wallet + appel Moov Money réel, voir services/transaction.js::
// sendUserMoney). 'ORANGE_MONEY' fait partie du type OperateurRetrait mais est refusé par le
// serveur pour l'instant (message explicite renvoyé) — proposé mais désactivé dans le
// sélecteur, plutôt que masqué, pour rester honnête sur ce qui existe côté modèle.
//
// Rendu en overlay custom (.modal-overlay/.modal-content, cf. admin-dashboard.html et 5
// autres écrans de l'app), et champs en HTML natif stylé (même convention que
// agent-payment.component.html/.scss, déjà éprouvée dans ce module) plutôt que
// mat-form-field/mat-select/mat-input : ces derniers se sont rendus visuellement cassés
// dans cette app (aucun contour, label superposé au texte saisi) — la coexistence Angular
// Material (thème M3 + prebuilt M2) + PrimeNG + Flowbite/Tailwind casse le mécanisme CSS
// (notched outline) dont mat-form-field dépend, alors que mat-button/mat-icon (plus
// simples, sans ce mécanisme) restent correctement stylés — conservés tels quels.
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

  /** `true` si le retrait a bien été créé, `false` sur annulation — jamais émis 2 fois. */
  @Output() ferme = new EventEmitter<boolean>();

  readonly operateurs: OperateurInfo[] = [
    { value: 'MOOV_MONEY', label: 'Moov Money', disponible: true },
    { value: 'ORANGE_MONEY', label: 'Orange Money (bientôt disponible)', disponible: false },
  ];

  readonly etape = signal<Etape>('formulaire');
  readonly enregistrement = signal(false);
  readonly erreur = signal<string | null>(null);

  readonly formatMontant = formatMontantXof;

  readonly form = this.fb.nonNullable.group({
    operator: this.fb.control<OperateurRetrait | null>(null, Validators.required),
    customerMsisdn: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    montant: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    motif: ['', Validators.maxLength(200)],
  });

  get operatorLabel(): string {
    return this.operateurs.find(o => o.value === this.form.value.operator)?.label ?? '';
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
    const { operator, customerMsisdn, montant, motif } = this.form.getRawValue();
    if (!operator || !customerMsisdn || !montant) return;

    this.enregistrement.set(true);
    this.erreur.set(null);

    this.financeData.enregistrerRetrait({ montant, customerMsisdn, operator, motif: motif || undefined }).subscribe({
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

  messageErreur(controle: 'operator' | 'customerMsisdn' | 'montant' | 'motif'): string {
    const champ = this.form.get(controle);
    if (!champ || !champ.errors || !champ.touched) return '';
    if (champ.errors['required']) return 'Ce champ est obligatoire';
    if (champ.errors['pattern']) return 'Numéro invalide (8 chiffres attendus)';
    if (champ.errors['min']) return 'Le montant doit être supérieur à 0';
    if (champ.errors['maxlength']) return `Maximum ${champ.errors['maxlength'].requiredLength} caractères`;
    return 'Valeur invalide';
  }
}
