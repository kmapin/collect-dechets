import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { ImportDraft, ImportParserService, ImportPreviewRow } from '../../services/import-parser.service';
import { ImportPreviewComponent } from './import-preview.component';

describe('ImportPreviewComponent', () => {
  let fixture: ComponentFixture<ImportPreviewComponent>;
  let parser: jasmine.SpyObj<ImportParserService>;

  beforeEach(() => {
    const uncertainRow: ImportPreviewRow = {
      row_number: 4,
      path: 'Pays QA / Ville QA / Secteur QA',
      type_code: 'SECTOR',
      name: 'Secteur QA',
      status: 'ERROR',
      parent_path: 'Pays QA / Ville QA',
      message: 'Écriture non confirmée après erreur réseau.',
      severity: 'error',
    };
    const draft: ImportDraft = {
      id: 'draft-123',
      fileName: 'qa-territorial.csv',
      rows: [uncertainRow],
      records: [{ rowNumber: 4, path: uncertainRow.path ?? '', nodes: [] }],
      statistics: { totalRows: 1, created: 0, reused: 0, duplicates: 0, errors: 0 },
      result: {
        created: 3,
        reused: 0,
        errors: 1,
        retryableErrors: 1,
        duplicates: 0,
        verified: true,
        verificationError: null,
        rows: [uncertainRow],
      },
    };
    parser = jasmine.createSpyObj<ImportParserService>('ImportParserService', [
      'getDraft',
      'confirmImport',
      'removeDraft',
      'generateReport',
      'downloadBlob',
    ]);
    parser.getDraft.and.returnValue(draft);

    TestBed.configureTestingModule({
      imports: [ImportPreviewComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'draft-123' } } },
        },
        { provide: ImportParserService, useValue: parser },
      ],
    });
  });

  afterEach(() => fixture?.destroy());

  it('restaure le résultat partiel et attend une action explicite avant toute reprise', () => {
    fixture = TestBed.createComponent(ImportPreviewComponent);
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('Import partiel');
    expect(content).toContain('3 unité(s) créée(s)');
    expect(content).toContain('1 ligne(s) non confirmée(s)');
    expect(content).toContain('Écriture non confirmée après erreur réseau.');
    expect(content).toContain('Réessayer les lignes non confirmées');
    expect(parser.confirmImport).not.toHaveBeenCalled();
  });
});
