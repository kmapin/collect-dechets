import { MatSelectModule } from '@angular/material/select';
import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';

import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PaymentService } from '../../../services/payment/payment.service';
import { MobileMoneyOperator, PaymentRequest } from '../../../models/payment/payment-request.model';
import { PaymentResponse, PaymentStatus } from '../../../models/payment/payment-response.model';
import { PaymentStatusComponent } from '../payment-status/payment-status';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OtpInputComponent } from '../otp-input/otp-input';

/**
 * Interface pour les informations d'affichage des opérateurs
 */
interface OperatorInfo {
  id: number;
  value: MobileMoneyOperator;
  label: string;
  color: string;
  icon?: string;
  image?: string;
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
    PaymentStatusComponent,
    OtpInputComponent
],
  templateUrl: './mobile-money-form.html',
  styleUrls: ['./mobile-money-form.scss']
})
export class MobileMoneyFormComponent implements OnInit {

  @ViewChild(OtpInputComponent) otpComponent?: OtpInputComponent;

  @Output() showPaymentDrawer = new EventEmitter<boolean>();
  @Input() tarifResponse: any | null = null;
  /** Formulaire de paiement */
  paymentForm: FormGroup;
  
  /** Indicateur de chargement pendant le traitement du paiement */
  isProcessing = false;
  

  /** Requête de paiement */
  paymentRequest: PaymentRequest | null = null;
  /** Réponse du paiement après traitement */
  paymentResponse: PaymentResponse | null = null;

  isRequestingOtp = false;
  currentStep: 'payment' | 'otp' | 'requiredOtp' = 'payment';
  errorMessage = '';
  
  /** Liste des opérateurs Mobile Money disponibles */
  operators: OperatorInfo[] = [
    {
      id:1,
      value: MobileMoneyOperator.ORANGE_MONEY,
      label: 'Orange Money',
      color: '#FF7900',
      image: 'assets/logoMobileMoney/Orange_Money-Logo.png'
    },
    {
      id:2,
      value: MobileMoneyOperator.MOOV_MONEY,
      label: 'Moov Money',
      color: '#009DDC',
      image: 'assets/logoMobileMoney/logo_moov_money.webp'
    },
    {
      id:3,
      value: MobileMoneyOperator.TELECEL_MONEY,
      label: 'Telecel Money',
      color: '#00D9A5',
      image: 'assets/logoMobileMoney/telecel1024X500.jpg'
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
      console.log('paymentResponse',this.paymentResponse);
      if (this.paymentResponse.status === 'SUCCESS' || this.paymentResponse.status === 'FAILED') {
        // Optionnel : nettoyer après affichage
        // this.paymentService.currentPaymentResponse = null;
      }
    }; 
  }

  //detecte les changements et met a jour le formulaire
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tarifResponse'] && this.tarifResponse) {
      console.log('tarifResponse reçu', this.tarifResponse);

      if (!this.paymentForm) {
        this.paymentForm = this.createForm();
      } else {
        this.paymentForm.patchValue({
          amount: this.tarifResponse.amount
        });
      }
    }
  }
  get operator() { return this.paymentForm.get('operator'); }
  get phoneNumber() { return this.paymentForm.get('phoneNumber'); }
  get amount() { return this.paymentForm.get('amount'); }
  get description() { return this.paymentForm.get('description'); }

  /**
   * Crée et initialise le formulaire de paiement
   */
  private createForm(): FormGroup {
    return this.fb.group({
      operator: ['', Validators.required],
      phoneNumber: ['', [
        Validators.required,
        Validators.pattern(/^\d{8}$/)
      ]],
      amount: [this.tarifResponse?.amount ?? 0, [
        Validators.required,
        Validators.min(1),
        Validators.max(1000000)
      ]],
      // Non obligatoire (demande produit) : un client doit pouvoir payer sans saisir de
      // motif. minLength(3) reste actif si un texte est saisi (Validators.minLength ne
      // s'applique pas à une valeur vide), pour éviter une description à 1-2 caractères
      // sans intérêt plutôt qu'une description absente.
      description: ['', [
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
      this.errorMessage = '';
      
      const request: PaymentRequest = {
        operator: this.paymentForm.value.operator,
        customerMsisdn: this.paymentForm.value.phoneNumber,
        phoneNumber: this.paymentForm.value.phoneNumber,
        amount: this.paymentForm.value.amount,
        pricingId : this.tarifResponse?.tarifId,
        walletId: this.tarifResponse?.agencyId,
        userId: this.tarifResponse?.userId,
        numberMonths: this.tarifResponse?.numberMonths,
        redevanceId: this.tarifResponse?.redevanceId,
        paiementGroupeId: this.tarifResponse?.paiementGroupeId,
        description: this.paymentForm.value.description
      };
      console.log('request in payment form', request);
      this.paymentService.processPayment(request).subscribe({
        next: (response) => {
          this.paymentResponse = response ? {
              ...response.data,
              message: response.message,
              amount: response.data.amount,
              operator: response.data.operator,
              transactionId: response.data.reference!,
              timestamp: new Date(),
              status: response.data?.status === 'INITIATED' ? PaymentStatus.PENDING_OTP : PaymentStatus.SUCCESS,
              requiresOtp: true,
            }
          : null;
          this.isProcessing = false;
          console.log('paymentResponse in payment form', this.paymentResponse);
          if (response.status === 'PENDING_OTP' || response.requiresOtp) {
            this.paymentService.currentPaymentResponse = response;
            // this.currentStep = 'otp';
            // this.router.navigate(['/otp']);
          }
        },
        error: (error) => {
          this.isProcessing = false;
          this.errorMessage = error?.message || "Une erreur est survenue lors du traitement du paiement.";
          console.error('Erreur de paiement:', error);
        }
      });
    }
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


  /**
   * Gestion de l'étape OTP
   */
  
  onOtpVerified(paymentResponse: PaymentResponse): void {
    this.isProcessing = false;
    this.paymentResponse = paymentResponse;
    console.log('OTP vérifié → nouvelle réponse', paymentResponse);
  }


  onCancelOtp(): void {
    this.currentStep = 'payment';
    this.paymentResponse = null;
    this.isRequestingOtp = false;
  }

  resetForm(): void {
    this.showPaymentDrawer.emit(false);
    this.paymentForm.reset();
    this.isProcessing = false;
    this.isRequestingOtp = false;
    this.currentStep = 'payment';
    this.paymentResponse = null;
  }

  setProcessing(processing: boolean): void {
    this.isProcessing = processing;
  }
}
