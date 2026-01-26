import { Message } from './../../../models/message.model';
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
import { PaymentResponse, PaymentStatus } from '../../../models/payment/payment-response.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MobileMoneyOperator } from '../../../models/payment/payment-request.model';
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
    /** Réponse de paiement à afficher */
  @Input() paymentResponse: PaymentResponse | null = null;
  
  @Output() otpVerified = new EventEmitter<PaymentResponse>();
  @Output() cancelOtp = new EventEmitter<void>();

  /** ID de transaction pour lequel l'OTP est demandé */
  transactionId: string = '';

  message : string = '';
  
  operator : string = '';
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
    const currentPayment = this.paymentResponse;
    if (!currentPayment) {
      this.router.navigate(['/payment']);
      return;
    }
  
    this.transactionId = currentPayment?.transactionId || '';
    this.amount = currentPayment.amount || 0;
    this.message = currentPayment.message || '';
    this.operator = currentPayment.operator || '';
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
 paymentOperator(operator : string): string {
    if (operator === MobileMoneyOperator.ORANGE_MONEY) {
      return 'Orange Money';
    } else if (operator === MobileMoneyOperator.MOOV_MONEY) {
      return 'Moov Money';
    } else {
      return 'Autre opérateur';
    }
  }

  /**
   * Soumet le code OTP
   */
  onVerifyOtp(): void {
    if (this.otpForm.valid && !this.isProcessing) {
      this.isProcessing = true;
      this.errorMessage = '';
      const otp = this.otpForm.value.otp;
      const otpForm ={
        otp: this.otpForm.value.otp,
        reference: this.transactionId
      }
      this.paymentService.validateOtp(otpForm).subscribe({
        next: (response) => {
          this.isProcessing = false;
          console.log('response of validate otp', response);
          if (response.success) {
            this.paymentResponse = response? {
              ...response,
              message: response.message ?? 'Paiement Orange Money validé avec succès ! Vous allez recevoir une confirmation par SMS.',
              amount: this.amount,
              operator: this.operator,
              transactionId: response.reference!,
              timestamp: new Date(),
              status: PaymentStatus.SUCCESS
            }: null;
            this.otpVerified.emit(this.paymentResponse!);
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
    this.cancelOtp.emit();
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
