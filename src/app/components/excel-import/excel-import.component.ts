import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgencyImportService } from '../../services/agency-import.service';
import { NotificationService } from '../../services/notification.service';
import { AgencyImportType, ImportConfirmResponse, ImportPreviewResponse, ImportRow } from '../../models/agency-import.model';

type Etape = 'depot' | 'apercu' | 'resultat';

/** Drawer d'import Excel réutilisable — `type` détermine uniquement le libellé et
 * l'endpoint appelé (voir AgencyImportService), toute la logique est partagée entre
 * Clients et Employés (même contrat backend, voir services/agencyImport.js). */
@Component({
  selector: 'app-excel-import',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './excel-import.component.html',
  styleUrl: './excel-import.component.scss',
})
export class ExcelImportComponent {
  @Input({ required: true }) type!: AgencyImportType;
  @Output() fermer = new EventEmitter<void>();
  /** Émis après une confirmation réussie (même partielle) — le parent doit
   * rafraîchir sa liste (clients/employés). */
  @Output() importReussi = new EventEmitter<void>();

  etape: Etape = 'depot';
  isDragOver = false;
  fichierSelectionne: File | null = null;

  isDownloadingTemplate = false;
  isAnalyzing = false;
  isImporting = false;
  isDownloadingReport = false;

  apercu: ImportPreviewResponse | null = null;
  resultat: ImportConfirmResponse | null = null;
  erreurGenerale: string | null = null;

  constructor(
    private importService: AgencyImportService,
    private notificationService: NotificationService,
  ) {}

  get titre(): string {
    return this.type === 'clients' ? 'Importer des clients' : 'Importer des employés';
  }

  get libelleEntite(): string {
    return this.type === 'clients' ? 'client' : 'employé';
  }

  get libelleEntitePluriel(): string {
    return this.type === 'clients' ? 'clients' : 'employés';
  }

  private get nomFichierModele(): string {
    return this.type === 'clients' ? 'clients_modele.xlsx' : 'employes_modele.xlsx';
  }

  get lignesImportables(): ImportRow[] {
    return this.apercu?.lignes.filter((l) => l.statut === 'valide') ?? [];
  }

  get aDesLignesRejetees(): boolean {
    const lignes = this.resultat?.lignes ?? this.apercu?.lignes ?? [];
    return lignes.some((l) => l.statut === 'erreur' || l.statut === 'doublon');
  }

  fermerDrawer(): void {
    this.fermer.emit();
  }

  telechargerModele(): void {
    this.isDownloadingTemplate = true;
    this.importService.downloadTemplate$(this.type).subscribe({
      next: (blob) => {
        this.declencherTelechargement(blob, this.nomFichierModele);
        this.isDownloadingTemplate = false;
      },
      error: () => {
        this.isDownloadingTemplate = false;
        this.notificationService.showError('Erreur', 'Impossible de télécharger le modèle Excel.');
      },
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(): void {
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const fichier = event.dataTransfer?.files?.[0];
    if (fichier) this.selectionnerFichier(fichier);
  }

  onFileSelected(event: Event): void {
    const fichier = (event.target as HTMLInputElement).files?.[0];
    if (fichier) this.selectionnerFichier(fichier);
  }

  private selectionnerFichier(fichier: File): void {
    if (!/\.(xlsx|xls)$/i.test(fichier.name)) {
      this.notificationService.showError('Fichier invalide', 'Sélectionnez un fichier Excel (.xlsx ou .xls).');
      return;
    }
    this.fichierSelectionne = fichier;
    this.analyser();
  }

  analyser(): void {
    if (!this.fichierSelectionne) return;
    this.isAnalyzing = true;
    this.erreurGenerale = null;
    this.importService.preview$(this.type, this.fichierSelectionne).subscribe({
      next: (reponse) => {
        this.apercu = reponse;
        this.etape = 'apercu';
        this.isAnalyzing = false;
      },
      error: (err) => {
        this.isAnalyzing = false;
        this.erreurGenerale = err?.error?.message || "Impossible d'analyser ce fichier.";
        this.notificationService.showError('Erreur', this.erreurGenerale!);
      },
    });
  }

  recommencer(): void {
    this.fichierSelectionne = null;
    this.apercu = null;
    this.resultat = null;
    this.erreurGenerale = null;
    this.etape = 'depot';
  }

  confirmer(): void {
    if (!this.lignesImportables.length) return;
    this.isImporting = true;
    this.importService.confirm$(this.type, this.lignesImportables).subscribe({
      next: (reponse) => {
        this.resultat = reponse;
        this.etape = 'resultat';
        this.isImporting = false;
        this.notificationService.showSuccess(
          'Import terminé',
          `${reponse.importes} ${reponse.importes > 1 ? this.libelleEntitePluriel : this.libelleEntite} importé(s).`,
        );
        this.importReussi.emit();
      },
      error: (err) => {
        this.isImporting = false;
        this.notificationService.showError('Erreur', err?.error?.message || "L'import a échoué.");
      },
    });
  }

  telechargerRapportErreurs(): void {
    const lignes = this.resultat?.lignes ?? this.apercu?.lignes ?? [];
    this.isDownloadingReport = true;
    this.importService.downloadErrorReport$(lignes).subscribe({
      next: (blob) => {
        this.declencherTelechargement(blob, 'rapport_erreurs_import.xlsx');
        this.isDownloadingReport = false;
      },
      error: () => {
        this.isDownloadingReport = false;
        this.notificationService.showError('Erreur', 'Impossible de générer le rapport.');
      },
    });
  }

  private declencherTelechargement(blob: Blob, nomFichier: string): void {
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier;
    lien.click();
    URL.revokeObjectURL(url);
  }
}
