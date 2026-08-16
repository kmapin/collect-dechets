import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import {
  NotificationSettingsService,
  NotificationSettingsData,
} from '../../services/notification-settings.service';
import { UserRole } from '../../models/user.model';

/**
 * Correspond à l'enum réel `Notification.type` (collecte-dechets-back/models/
 * Notification.js) — ne pas dupliquer/étendre cette liste sans mettre à jour
 * l'enum backend en parallèle, sous peine de proposer des toggles pour des
 * types qui n'existeront jamais.
 */
const EVENT_TYPES: { key: string; label: string }[] = [
  { key: 'Subscribed', label: "Confirmation d'abonnement" },
  { key: 'Redevance', label: 'Rappel de paiement (échéance)' },
  { key: 'Contrat', label: 'Contrat (création / résiliation)' },
  { key: 'Signalement', label: 'Signalement (création / affectation / résolution)' },
  { key: 'Retrait', label: 'Retrait (agence)' },
  { key: 'Planning', label: 'Planning' },
  { key: 'Assingnment', label: 'Affectation' },
  { key: 'AgencyAdd', label: "Ajout d'agence" },
];

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-settings.html',
  styleUrl: './notification-settings.scss',
})
export class NotificationSettingsComponent implements OnInit {
  eventTypes = EVENT_TYPES;
  isGlobal = false;
  agencyId: string | null = null;
  isLoading = true;
  isSaving = false;
  testEmail = '';
  isSendingTest = false;

  settings: NotificationSettingsData = {
    channels: { email: false, sms: false, app: true },
    eventsEnabled: {},
    smtp: {},
  };

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private settingsService: NotificationSettingsService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    // super_admin configure les réglages globaux (plateforme) ; un manager ne
    // configure que les réglages de SA propre agence — jamais le global.
    this.isGlobal = user?.role === UserRole.SUPER_ADMIN;
    this.agencyId = (user as any)?.agencyId || null;
    this.load();
  }

  private load(): void {
    this.isLoading = true;
    const request$ = this.isGlobal
      ? this.settingsService.getGlobal$()
      : this.settingsService.getForAgency$(this.agencyId || '');

    request$.subscribe({
      next: (res) => {
        const data = res?.data;
        if (data) {
          this.settings = {
            channels: {
              email: data.channels?.email ?? false,
              sms: data.channels?.sms ?? false,
              app: data.channels?.app ?? true,
            },
            eventsEnabled: { ...data.eventsEnabled },
            smtp: { ...data.smtp },
          };
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  isEventEnabled(key: string): boolean {
    // Absent de la config = activé par défaut (même règle que côté backend,
    // services/notificationSettings.js::isEmailEnabledForEvent).
    return this.settings.eventsEnabled[key] !== false;
  }

  toggleEvent(key: string): void {
    this.settings.eventsEnabled = {
      ...this.settings.eventsEnabled,
      [key]: !this.isEventEnabled(key),
    };
  }

  save(): void {
    this.isSaving = true;
    const request$ = this.isGlobal
      ? this.settingsService.updateGlobal$(this.settings)
      : this.settingsService.updateForAgency$(this.agencyId || '', this.settings);

    request$.subscribe({
      next: () => {
        this.isSaving = false;
        this.notificationService.showSuccess('Réglages enregistrés', 'La configuration des notifications a été mise à jour.');
      },
      error: () => {
        this.isSaving = false;
        this.notificationService.showError('Erreur', "Impossible d'enregistrer les réglages pour le moment.");
      },
    });
  }

  sendTest(): void {
    if (!this.testEmail) {
      this.notificationService.showError('Erreur', 'Saisissez une adresse email de test.');
      return;
    }
    this.isSendingTest = true;
    this.settingsService.sendTestEmail$(this.testEmail).subscribe({
      next: () => {
        this.isSendingTest = false;
        this.notificationService.showSuccess('Email envoyé', `Un email de test a été envoyé à ${this.testEmail}.`);
      },
      error: () => {
        this.isSendingTest = false;
        this.notificationService.showError('Échec de l\'envoi', "L'email de test n'a pas pu être envoyé — vérifiez la configuration SMTP.");
      },
    });
  }
}
