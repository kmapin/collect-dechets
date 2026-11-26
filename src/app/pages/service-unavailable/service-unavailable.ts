import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  clearTerritorialImportReturnUrl,
  getTerritorialImportReturnUrl,
} from '../../core/territorial-import-return';

/** Page affichée quand le backend est injoignable (panne serveur : 502/503/504,
 * ou requête réseau qui échoue totalement — status 0, "Failed to fetch"). Déclenchée
 * globalement par auth-interceptor-interceptor.ts, jamais par un composant précis. */
@Component({
  selector: 'app-service-unavailable',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-unavailable.html',
  styleUrl: './service-unavailable.scss',
})
export class ServiceUnavailable implements OnInit, OnDestroy {
  isChecking = false;
  isBackOnline = false;
  attemptCount = 0;
  secondsToNextRetry = 0;
  interruptedImportUrl: string | null = null;

  private readonly retryIntervalSeconds = 15;
  private countdownHandle?: ReturnType<typeof setInterval>;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.interruptedImportUrl = getTerritorialImportReturnUrl();
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.countdownHandle) clearInterval(this.countdownHandle);
  }

  private startCountdown(): void {
    if (this.countdownHandle) clearInterval(this.countdownHandle);
    this.secondsToNextRetry = this.retryIntervalSeconds;
    this.countdownHandle = setInterval(() => {
      this.secondsToNextRetry -= 1;
      if (this.secondsToNextRetry <= 0) {
        this.verifierConnexion();
      }
    }, 1000);
  }

  /** Ping léger vers le serveur (Swagger JSON, toujours servi à la racine, hors
   * préfixe /api) — ne dépend d'aucune route métier ni d'authentification. */
  verifierConnexion(): void {
    if (this.isChecking) return;
    this.isChecking = true;
    this.attemptCount += 1;

    fetch(`${environment.apiRoot}/api-docs.json`, { method: 'GET', cache: 'no-store' })
      .then((res) => {
        this.isChecking = false;
        if (res.ok) {
          this.isBackOnline = true;
          if (this.countdownHandle) clearInterval(this.countdownHandle);
          if (!this.interruptedImportUrl) {
            setTimeout(() => this.router.navigateByUrl('/'), 1200);
          }
        } else {
          this.startCountdown();
        }
      })
      .catch(() => {
        this.isChecking = false;
        this.startCountdown();
      });
  }

  retourImportInterrompu(): void {
    if (!this.interruptedImportUrl) return;

    const returnUrl = this.interruptedImportUrl;
    this.interruptedImportUrl = null;
    clearTerritorialImportReturnUrl();
    void this.router.navigateByUrl(returnUrl);
  }

  retourAccueil(): void {
    this.interruptedImportUrl = null;
    clearTerritorialImportReturnUrl();
    this.router.navigateByUrl('/');
  }
}
