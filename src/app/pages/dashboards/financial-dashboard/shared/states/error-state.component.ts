import { Component, EventEmitter, Input, Output } from '@angular/core';

// Panneau d'erreur standard avec retry — remplace les blocs `.fin-error` dupliqués dans
// chaque écran (dashboard, payments, withdrawals, clients, client-sheet, monthly-tracking,
// statement, agent-payment).
@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [],
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.scss',
})
export class ErrorStateComponent {
  @Input({ required: true }) message = '';
  @Output() retry = new EventEmitter<void>();
}
