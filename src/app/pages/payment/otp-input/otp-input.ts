import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PaymentService } from '../../../services/payment/payment.service';
import { Router } from '@angular/router';
import { PaymentStatus } from '../../../models/payment/payment-response.model';
/**
 * Composant de saisie OTP pour validation Orange Money
 */
@Component({
  selector: 'app-otp-input',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './otp-input.html',
  styleUrls: ['./otp-input.scss']
})
export class OtpInputComponent implements OnInit {
  /** ID de transaction pour lequel l'OTP est demandé */
  transactionId: string = '';
  
  /** Montant de la transaction */
  amount: number = 0;
  
  /** Formulaire OTP */
  otpForm: FormGroup;
  
  /** Indicateur de traitement */
  isProcessing = false;
  
  /** Message d'erreur */
  errorMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private paymentService: PaymentService,
    private router: Router
  ) {
    this.otpForm = this.fb.group({
      otp: ['', [
        Validators.required,
        Validators.pattern(/^\d{6}$/),
        Validators.minLength(6),
        Validators.maxLength(6)
      ]]
    });
  }

  ngOnInit(): void {
    const currentPayment = this.paymentService.currentPaymentResponse;
  
    if (!currentPayment) {
      this.router.navigate(['/payment']);
      return;
    }
  
    this.transactionId = currentPayment.transactionId;
    this.amount = currentPayment.amount || 0;
  
    // 🔐 Gestion OTP propre et réactive
    this.otpForm.get('otp')?.valueChanges.subscribe(value => {
      if (!value) return;
  
      const numericValue = value.replace(/\D/g, '').slice(0, 6);
  
      if (value !== numericValue) {
        this.otpForm.get('otp')?.setValue(
          numericValue,
          { emitEvent: false }
        );
      }
    });
  }
  

  /**
   * Soumet le code OTP
   */
  onSubmit(): void {
    if (this.otpForm.valid && !this.isProcessing) {
      this.isProcessing = true;
      this.errorMessage = '';
      const otp = this.otpForm.value.otp;
      
      this.paymentService.validateOtp(this.transactionId, otp).subscribe({
        next: (response) => {
          this.isProcessing = false;
          
          if (response.status === PaymentStatus.SUCCESS) {
            // Mise à jour de la réponse courante pour l'affichage du statut
            this.paymentService.currentPaymentResponse = response;
            // Redirection vers la page de paiement (qui affichera le statut)
            // Idéalement on aurait une page de succès dédiée ou on réutiliserait le composant
            // Pour l'instant, on retourne au formulaire qui gère l'affichage du statut si response est set
            // Mais le formulaire est un nouveau composant via le router...
            // Modifions la logique : on reste ici et on affiche le succès ou on redirige
            alert(response.message); // Simple feedback pour l'instant
            this.router.navigate(['/payment']);
          } else {
            this.errorMessage = response.message;
          }
        },
        error: (error) => {
          this.isProcessing = false;
          this.errorMessage = "Une erreur est survenue lors de la validation.";
          console.error(error);
        }
      });
    }
  }

  /**
   * Annule la saisie OTP
   */
  onCancel(): void {
    this.router.navigate(['/payment']);
  }

  /**
   * Retourne le message d'erreur pour le champ OTP
   */
  getOtpErrorMessage(): string {
    const field = this.otpForm.get('otp');
    
    if (!field || !field.errors || !field.touched) {
      return '';
    }
    
    if (field.errors['required']) {
      return 'Le code OTP est obligatoire';
    }
    
    if (field.errors['pattern'] || field.errors['minlength'] || field.errors['maxlength']) {
      return 'Le code OTP doit contenir exactement 6 chiffres';
    }
    
    return 'Code OTP invalide';
  }
 
}
