import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TerritoryService } from '../../services/territory.service';
import { ImportDraft, ImportParserService } from '../../services/import-parser.service';
import { PageHeaderComponent } from '../../../../shared/decoupage-territorial/page-header.component';
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-angular';
import { IconComponent } from '../../../../shared/decoupage-territorial/icon.component';

@Component({
  selector: 'app-import-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, IconComponent],
  templateUrl: './import-page.component.html',
  styleUrl: './import-page.component.scss',
})
export class ImportPageComponent {
  selectedFile = signal<File | null>(null);
  parsing = signal(false);
  analyzing = signal(false);
  error = signal<string | null>(null);
  dragOver = signal(false);
  icons = { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, ArrowRight, Loader2 };

  constructor(
    private territory: TerritoryService,
    private parser: ImportParserService,
    private router: Router
  ) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.setFile(input.files[0]);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave() {
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver.set(false);
    if (event.dataTransfer?.files?.length) {
      this.setFile(event.dataTransfer.files[0]);
    }
  }

  setFile(file: File) {
    this.error.set(null);
    this.selectedFile.set(null);
    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    if (ext !== 'csv') {
      this.error.set('Format non autorisé. Seuls les fichiers CSV (.csv) sont acceptés.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.error.set('Fichier trop volumineux (max 10 Mo).');
      return;
    }
    this.selectedFile.set(file);
  }

  async downloadTemplate() {
    const blob = await this.parser.generateTemplate();
    this.parser.downloadBlob(blob, 'modele-territorial.csv');
  }

  async analyze() {
    const file = this.selectedFile();
    if (!file) return;

    this.parsing.set(true);
    this.error.set(null);

    try {
      const parsed = await this.parser.parseFile(file);
      if (parsed.length === 0) {
        this.error.set('Le fichier ne contient aucune ligne de données.');
        this.parsing.set(false);
        return;
      }
      this.analyzing.set(true);
      await this.territory.loadApiUnits();
      const result = this.parser.analyze(parsed, this.territory.getApiUnits());
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const draft: ImportDraft = {
        id,
        fileName: file.name,
        rows: result.rows,
        records: result.records,
        statistics: result.statistics,
      };
      this.parser.saveDraft(draft);
      await this.router.navigate(['/territorial/import', id, 'preview']);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.error.set(message
        .replace('IMPORT_COLUMN_MISSING:', 'Colonne obligatoire manquante :')
        .replace('IMPORT_FILE_INVALID:', 'Fichier invalide :')
        .replace('IMPORT_FILE_ENCODING:', 'Encodage invalide :')
        || 'Erreur lors de l’analyse ou du chargement des unités existantes.');
    } finally {
      this.parsing.set(false);
      this.analyzing.set(false);
    }
  }
}
