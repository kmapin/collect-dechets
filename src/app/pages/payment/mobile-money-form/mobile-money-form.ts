import { MatSelectModule } from '@angular/material/select';
import { Component, OnInit } from '@angular/core';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PaymentService } from '../../../services/payment/payment.service';
import { MobileMoneyOperator, PaymentRequest } from '../../../models/payment/payment-request.model';
import { PaymentResponse } from '../../../models/payment/payment-response.model';
import { PaymentStatusComponent } from '../payment-status/payment-status';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * Interface pour les informations d'affichage des opérateurs
 */
interface OperatorInfo {
  value: MobileMoneyOperator;
  label: string;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-mobile-money-form',
  // standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSelectModule,
    PaymentStatusComponent
],
  templateUrl: './mobile-money-form.html',
  styleUrls: ['./mobile-money-form.scss']
})
export class MobileMoneyFormComponent implements OnInit {
  /** Formulaire de paiement */
  paymentForm: FormGroup;
  
  /** Indicateur de chargement pendant le traitement du paiement */
  isProcessing = false;
  
  /** Réponse du paiement après traitement */
  paymentResponse: PaymentResponse | null = null;
  
  /** Liste des opérateurs Mobile Money disponibles */
  operators: OperatorInfo[] = [
    {
      value: MobileMoneyOperator.ORANGE_MONEY,
      label: 'Orange Money',
      color: '#FF7900',
      icon: '🟠'
    },
    {
      value: MobileMoneyOperator.MTN_MOMO,
      label: 'MTN Mobile Money',
      color: '#FFCC00',
      icon: '🟡'
    },
    {
      value: MobileMoneyOperator.MOOV_MONEY,
      label: 'Moov Money',
      color: '#009DDC',
      icon: '🔵'
    },
    {
      value: MobileMoneyOperator.WAVE,
      label: 'Wave',
      color: '#00D9A5',
      icon: '🌊'
    }
  ];

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private router: Router
  ) {
    this.paymentForm = this.createForm();
  }

  ngOnInit(): void {
    // Restauration de l'état si on revient de la page OTP
    if (this.paymentService.currentPaymentResponse) {
      this.paymentResponse = this.paymentService.currentPaymentResponse;
      
      // Si le paiement est terminé (succès ou échec), on peut nettoyer le service
      // mais on garde l'affichage pour l'utilisateur
      if (this.paymentResponse.status === 'SUCCESS' || this.paymentResponse.status === 'FAILED') {
        // Optionnel : nettoyer après affichage
        // this.paymentService.currentPaymentResponse = null;
      }
    }
  }

  /**
   * Crée et initialise le formulaire de paiement
   */
  private createForm(): FormGroup {
    return this.fb.group({
      operator: ['', Validators.required],
      phoneNumber: ['', [
        Validators.required,
        Validators.pattern(/^(\+?[1-9]\d{9,14}|0\d{8,13})$/)
      ]],
      amount: ['', [
        Validators.required,
        Validators.min(1),
        Validators.max(1000000)
      ]],
      description: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(200)
      ]]
    });
  }

  /**
   * Soumet le formulaire et traite le paiement
   */
  onSubmit(): void {
    if (this.paymentForm.valid && !this.isProcessing) {
      this.isProcessing = true;
      this.paymentResponse = null;
      
      const request: PaymentRequest = {
        operator: this.paymentForm.value.operator,
        phoneNumber: this.paymentForm.value.phoneNumber,
        amount: this.paymentForm.value.amount,
        description: this.paymentForm.value.description
      };
      
      this.paymentService.processPayment(request).subscribe({
        next: (response) => {
          this.paymentResponse = response;
          this.isProcessing = false;
          
          if (response.status === 'PENDING_OTP' || response.requiresOtp) {
            this.paymentService.currentPaymentResponse = response;
            this.router.navigate(['/otp']);
          }
        },
        error: (error) => {
          console.error('Erreur de paiement:', error);
          this.isProcessing = false;
        }
      });
    }
  }

  /**
   * Réinitialise le formulaire pour un nouveau paiement
   */
  resetForm(): void {
    this.paymentForm.reset();
    this.paymentResponse = null;
    this.isProcessing = false;
  }

  /**
   * Retourne le message d'erreur pour un champ donné
   */
  getErrorMessage(fieldName: string): string {
    const field = this.paymentForm.get(fieldName);
    
    if (!field || !field.errors || !field.touched) {
      return '';
    }
    
    if (field.errors['required']) {
      return 'Ce champ est obligatoire';
    }
    
    if (field.errors['pattern']) {
      return 'Format de numéro invalide';
    }
    
    if (field.errors['min']) {
      return 'Le montant doit être supérieur à 0';
    }
    
    if (field.errors['max']) {
      return 'Le montant ne peut pas dépasser 1,000,000 FCFA';
    }
    
    if (field.errors['minlength']) {
      return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    }
    
    if (field.errors['maxlength']) {
      return `Maximum ${field.errors['maxlength'].requiredLength} caractères`;
    }
    
    return 'Champ invalide';
  }
}
