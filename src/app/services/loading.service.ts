import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(true);
  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  constructor() {}

  // Méthode pour définir l'état de chargement
  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  // Méthode pour obtenir l'état actuel
  isLoading(): boolean {
    return this.loadingSubject.value;
  }

  // Méthode pour simuler un chargement avec un délai minimum
  simulateLoading(minDelay: number = 1500): Promise<void> {
    this.setLoading(true);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        this.setLoading(false);
        resolve();
      }, minDelay);
    });
  }

  // Méthode pour afficher le chargement pendant l'exécution d'une promesse
  async showLoadingDuring<T>(promise: Promise<T>, minDelay: number = 500): Promise<T> {
    this.setLoading(true);
    
    const [result] = await Promise.all([
      promise,
      new Promise(resolve => setTimeout(resolve, minDelay))
    ]);
    
    this.setLoading(false);
    return result;
  }
}