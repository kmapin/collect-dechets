import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TerritoryService } from '../../services/territory.service';
import { ImportParserService, ParsedRow, AnalysisResult } from '../../services/import-parser.service';
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
  analysis = signal<AnalysisResult | null>(null);
  parsedRows = signal<ParsedRow[]>([]);
  dragOver = signal(false);
  icons = { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, ArrowRight, Loader2 };

  profile = this.territory.getProfile('BF')!;

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
    this.analysis.set(null);
    const ext = file.name.toLowerCase().split('.').pop() ?? '';
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      this.error.set('Format non autorisé. Seuls les fichiers .xlsx et .csv sont acceptés.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.error.set('Fichier trop volumineux (max 10 Mo).');
      return;
    }
    this.selectedFile.set(file);
  }

  async downloadTemplate() {
    const blob = await this.parser.generateTemplate(this.profile);
    this.parser.downloadBlob(blob, `modele-territorial-${this.profile.country_code}.csv`);
  }

  async analyze() {
    const file = this.selectedFile();
    if (!file) return;

    this.parsing.set(true);
    this.error.set(null);
    this.analysis.set(null);

    try {
      const parsed = await this.parser.parseFile(file);
      if (parsed.length === 0) {
        this.error.set('Le fichier ne contient aucune ligne de données.');
        this.parsing.set(false);
        return;
      }
      this.parsedRows.set(parsed);

      this.analyzing.set(true);
      const existingUnits = this.territory.listUnits({ pageSize: 100000 }).data;
      const result = this.parser.analyze(parsed, this.profile, existingUnits);

      const imp = await this.parser.createImport(file.name, this.profile.country_code);
      this.parser.saveImportRows(imp.id, result.rows);
      this.territory.logAudit('IMPORT_ANALYZE', 'territorial_imports', imp.id, file.name, result.statistics);

      this.router.navigate(['/territorial/import', imp.id, 'preview']);
    } catch (e: any) {
      const msg = e.message ?? String(e);
      this.error.set(
        msg.startsWith('IMPORT_COLUMN_MISSING')
          ? msg.replace('IMPORT_COLUMN_MISSING:', 'Colonne obligatoire manquante : ')
          : msg.startsWith('IMPORT_FILE_INVALID')
            ? msg.replace('IMPORT_FILE_INVALID:', 'Fichier invalide : ')
            : 'Erreur lors de l\'analyse : ' + msg
      );
    } finally {
      this.parsing.set(false);
      this.analyzing.set(false);
    }
  }
}
