import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { PaymentRequest, MobileMoneyOperator } from '../../models/payment/payment-request.model';
import { PaymentResponse, PaymentStatus } from '../../models/payment/payment-response.model';

/**
 * Service de gestion des paiements Mobile Money
 * Simule les appels API pour le traitement des paiements
 */
@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  /** Réponse du paiement en cours de traitement */
  currentPaymentResponse: PaymentResponse | null = null;

  /**
   * Simule un appel API pour traiter un paiement Mobile Money
   * @param request Requête de paiement contenant les informations nécessaires
   * @returns Observable de la réponse de paiement
   */
  processPayment(request: PaymentRequest): Observable<PaymentResponse> {
    // Génération d'un ID de transaction unique
    const transactionId = this.generateTransactionId();
    
    // Simulation d'un délai réseau (2-4 secondes)
    const networkDelay = Math.random() * 2000 + 2000;
    
    // Pour Orange Money, on demande un OTP
    if (request.operator === MobileMoneyOperator.ORANGE_MONEY || request.operator === MobileMoneyOperator.MOOV_MONEY) {
      const response: PaymentResponse = {
        transactionId,
        status: PaymentStatus.PENDING_OTP,
        message:request.operator === MobileMoneyOperator.ORANGE_MONEY ? 
        'Un code OTP a été envoyé à votre numéro Orange Money. Veuillez le saisir pour confirmer le paiement.' 
        : 'Un code OTP a été envoyé à votre numéro Moov Money. Veuillez le saisir pour confirmer le paiement.',
        requiresOtp: true,
        amount: request.amount,
        timestamp: new Date(),
        operator : request.operator
      };
      
      return of(response).pipe(delay(networkDelay));
    }
    
    // Pour les autres opérateurs, simulation aléatoire de succès/échec (80% de succès)
    const isSuccess = Math.random() > 0.2;
    
    if (isSuccess) {
      const response: PaymentResponse = {
        transactionId,
        status: PaymentStatus.SUCCESS,
        message: 'Paiement effectué avec succès. Vous allez recevoir une confirmation par SMS.',
        amount: request.amount,
        timestamp: new Date()
      };
      
      return of(response).pipe(delay(networkDelay));
    } else {
      const response: PaymentResponse = {
        transactionId,
        status: PaymentStatus.FAILED,
        message: 'Le paiement a échoué. Veuillez vérifier votre solde et réessayer.',
        amount: request.amount,
        timestamp: new Date()
      };
      
      return of(response).pipe(delay(networkDelay));
    }
  }

  /**
   * Valide un code OTP pour Orange Money
   * @param transactionId Identifiant de la transaction
   * @param otp Code OTP à valider
   * @returns Observable de la réponse de paiement
   */
  validateOtp(transactionId: string, otp: string): Observable<PaymentResponse> {
    // Simulation d'un délai de validation (1-2 secondes)
    const validationDelay = Math.random() * 1000 + 1000;
    
    // Pour la simulation, on accepte n'importe quel code à 6 chiffres
    // En production, ceci serait validé par l'API Orange Money
    const isValidOtp = /^\d{6}$/.test(otp);
    
    // Simulation : 90% de succès si le format est correct
    const isSuccess = isValidOtp && Math.random() > 0.1;
    
    if (isSuccess) {
      const response: PaymentResponse = {
        transactionId,
        status: PaymentStatus.SUCCESS,
        message: 'Paiement Orange Money validé avec succès ! Vous allez recevoir une confirmation par SMS.',
        timestamp: new Date()
      };
      
      return of(response).pipe(delay(validationDelay));
    } else {
      const response: PaymentResponse = {
        transactionId,
        status: PaymentStatus.FAILED,
        message: isValidOtp 
          ? 'Code OTP incorrect. Le paiement a été annulé.'
          : 'Format de code OTP invalide. Le paiement a été annulé.',
        timestamp: new Date()
      };
      
      return of(response).pipe(delay(validationDelay));
    }
  }

  /**
   * Vérifie le statut d'une transaction
   * @param transactionId Identifiant de la transaction
   * @returns Observable de la réponse de paiement
   */
  checkTransactionStatus(transactionId: string): Observable<PaymentResponse> {
    // Simulation d'une vérification de statut
    const response: PaymentResponse = {
      transactionId,
      status: PaymentStatus.SUCCESS,
      message: 'Transaction trouvée',
      timestamp: new Date()
    };
    
    return of(response).pipe(delay(1000));
  }

  /**
   * Génère un identifiant de transaction unique
   * @returns Identifiant de transaction au format TXN-XXXXXXXXXX
   */
  private generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `TXN-${timestamp}${random}`;
  }

  /**
   * Valide un numéro de téléphone Mobile Money
   * @param phoneNumber Numéro de téléphone à valider
   * @returns true si le numéro est valide, false sinon
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Format accepté: commence par +, suivi de 10-15 chiffres
    // Ou commence par 0, suivi de 9-14 chiffres
    const phoneRegex = /^(\+?[1-9]\d{9,14}|0\d{8,13})$/;
    return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
  }

  /**
   * Valide un montant de paiement
   * @param amount Montant à valider
   * @returns true si le montant est valide, false sinon
   */
  validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 1000000; // Max 1,000,000
  }
}
