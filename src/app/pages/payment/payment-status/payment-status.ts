import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PaymentResponse, PaymentStatus } from '../../../models/payment/payment-response.model';

/**
 * Composant affichant le statut d'un paiement Mobile Money
 */
@Component({
  selector: 'app-payment-status',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './payment-status.html',
  styleUrls: ['./payment-status.css']
})
export class PaymentStatusComponent {
  /** Réponse de paiement à afficher */
  @Input() paymentResponse: PaymentResponse | null = null;
  
  /** Référence à l'énumération PaymentStatus pour utilisation dans le template */
  PaymentStatus = PaymentStatus;

  /**
   * Retourne l'icône appropriée selon le statut du paiement
   */
  getStatusIcon(): string {
    if (!this.paymentResponse) return 'help_outline';
    
    switch (this.paymentResponse.status) {
      case PaymentStatus.SUCCESS:
        return 'check_circle';
      case PaymentStatus.FAILED:
        return 'error';
      case PaymentStatus.PENDING:
        return 'schedule';
      case PaymentStatus.PENDING_OTP:
        return 'lock_clock';
      default:
        return 'help_outline';
    }
  }

  /**
   * Retourne la classe CSS appropriée selon le statut du paiement
   */
  getStatusClass(): string {
    if (!this.paymentResponse) return '';
    
    switch (this.paymentResponse.status) {
      case PaymentStatus.SUCCESS:
        return 'status-success';
      case PaymentStatus.FAILED:
        return 'status-failed';
      case PaymentStatus.PENDING:
      case PaymentStatus.PENDING_OTP:
        return 'status-pending';
      default:
        return '';
    }
  }
}
