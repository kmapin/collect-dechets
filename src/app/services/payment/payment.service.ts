import { inject, Injectable } from "@angular/core";
import { Observable, of, throwError } from "rxjs";
import { catchError, delay, tap } from "rxjs/operators";
import {
  PaymentRequest,
  MobileMoneyOperator,
} from "../../models/payment/payment-request.model";
import {
  PaymentResponse,
  PaymentStatus,
} from "../../models/payment/payment-response.model";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { environment } from "../../../environments/environment";

/**
 * Service de gestion des paiements Mobile Money
 * Simule les appels API pour le traitement des paiements
 */
@Injectable({
  providedIn: "root",
})
export class PaymentService {
  readonly http = inject(HttpClient);
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

    const otpOperators = [
      MobileMoneyOperator.ORANGE_MONEY,
      MobileMoneyOperator.MOOV_MONEY,
      MobileMoneyOperator.TELECEL_MONEY,
    ];

    if (otpOperators.includes(request.operator)) {
      return this.http
        .post<PaymentResponse>(
          `${environment.apiUrl}/transactions/initiate`,
          request,
        )
        .pipe(
          tap((res) => console.log("response from api", res)),
          delay(networkDelay),
          catchError((err: HttpErrorResponse) => {
            const message =
              err?.error?.message ||
              err?.error?.error ||
              err?.message ||
              "Une erreur inattendue est survenue lors de l'initiation du paiement.";
            return throwError(() => new Error(message));
          }),
        );
    }

    return of({
      transactionId,
      status: PaymentStatus.FAILED,
      message: "Le paiement a échoué. Veuillez vérifier votre solde et réessayer.",
      amount: request.amount,
      timestamp: new Date(),
    }).pipe(delay(networkDelay));
  }

  /**
   * Valide un code OTP pour Orange Money
   * @param transactionId Identifiant de la transaction
   * @param otp Code OTP à valider
   * @returns Observable de la réponse de paiement
   */
  validateOtp(otpPayload: {
    otp: string;
    reference: string;
  }): Observable<PaymentResponse> {
    return this.http
      .post<any>(
        `${environment.apiUrl}/transactions/confirm`,
        otpPayload,
      )
      .pipe(
        tap((res) => console.log("response otp validation from api", res)),
        catchError((err: HttpErrorResponse) => {
          const message =
            err?.error?.message ||
            err?.error?.error ||
            err?.message ||
            "Une erreur inattendue est survenue lors de la validation de l'OTP.";
          return throwError(() => new Error(message));
        }),
      );
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
      message: "Transaction trouvée",
      timestamp: new Date(),
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
    return phoneRegex.test(phoneNumber.replace(/\s/g, ""));
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
