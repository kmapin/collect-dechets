import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { TerritoryHttpService } from '../../../services/territory-http.service';
import { TerritorialUnit } from '../models/models';
import { ImportDraft, ImportParserService } from './import-parser.service';
import { TerritoryService } from './territory.service';

describe('ImportParserService', () => {
  const csv = (body: string, name = 'territoires.csv') => new File([body], name, { type: 'text/csv' });

  function createUnit(
    id: string,
    typeCode: string,
    name: string,
    parentId: string | null,
    depth: number,
  ): TerritorialUnit {
    return {
      id,
      country_code: 'BF',
      type_code: typeCode,
      name,
      normalized_name: name.toLowerCase(),
      parent_id: parentId,
      ancestor_ids: parentId ? [parentId] : [],
      depth,
      code: null,
      sort_order: 0,
      metadata: {},
      created_at: '',
      updated_at: '',
      created_by: null,
      updated_by: null,
    };
  }

  function createHarness(options: {
    failCityOnce?: boolean;
    loseCityResponseOnce?: boolean;
    hideCityOnLoads?: number[];
  } = {}) {
    const persisted: TerritorialUnit[] = [];
    let loaded: TerritorialUnit[] = [];
    let cityAttempts = 0;
    let loadAttempts = 0;
    const api = {
      createCountry: jasmine.createSpy().and.callFake(() => {
        persisted.push(createUnit('country-id', 'COUNTRY', 'Burkina Faso', null, 0));
        return of({ id: 'country-id' });
      }),
      createCity: jasmine.createSpy().and.callFake(() => {
        cityAttempts++;
        if (options.failCityOnce && cityAttempts === 1) {
          return throwError(() => new HttpErrorResponse({
            status: 400,
            error: { message: 'Échec de création de la ville.' },
          }));
        }
        persisted.push(createUnit('city-id', 'CITY', 'Ouagadougou', 'country-id', 1));
        if (options.loseCityResponseOnce && cityAttempts === 1) {
          return throwError(() => new Error('Réponse API perdue après création.'));
        }
        return of({ id: 'city-id' });
      }),
    } as unknown as TerritoryHttpService;
    const territory = {
      loadApiUnits: jasmine.createSpy().and.callFake(async () => {
        loadAttempts++;
        loaded = persisted.filter((unit) => !(
          unit.type_code === 'CITY' && options.hideCityOnLoads?.includes(loadAttempts)
        ));
        return loaded;
      }),
      getApiUnits: jasmine.createSpy().and.callFake(() => loaded),
    } as unknown as TerritoryService;
    return {
      parser: new ImportParserService(api, territory),
      api,
      territory,
      persisted,
      getCityAttempts: () => cityAttempts,
    };
  }

  function draftFor(parser: ImportParserService, id = `test-${Date.now()}`): ImportDraft {
    const analysis = parser.analyze(
      [{
        rowNumber: 2,
        values: ['Burkina Faso', 'Ouagadougou', '', '', '', '', ''],
        raw: {},
      }],
      [],
    );
    const draft: ImportDraft = {
      id,
      fileName: 'territoires.csv',
      rows: analysis.rows,
      records: analysis.records,
      statistics: analysis.statistics,
    };
    parser.saveDraft(draft);
    return draft;
  }

  it('analyse un CSV valide et conserve les colonnes facultatives vides', async () => {
    const parser = createHarness().parser;
    const rows = await parser.parseFile(csv(
      'Pays;Ville;Arrondissement;Secteur;Quartier;Latitude;Longitude\r\nBurkina Faso;Ouagadougou;;;;;',
    ));

    expect(rows.length).toBe(1);
    expect(rows[0].values).toEqual(['Burkina Faso', 'Ouagadougou', '', '', '', '', '']);
  });

  it('rejette un CSV vide, une colonne obligatoire absente et un encodage invalide', async () => {
    const parser = createHarness().parser;

    await expectAsync(parser.parseFile(csv(''))).toBeRejectedWithError(/fichier est vide/i);
    await expectAsync(parser.parseFile(csv('Pays;Arrondissement\nBF;A1'))).toBeRejectedWithError(/Ville/);
    await expectAsync(parser.parseFile(new File([new Uint8Array([0xc3, 0x28])], 'invalid.csv')))
      .toBeRejectedWithError(/UTF-8/);
  });

  it('signale les relations territoriales invalides et les chemins répétés', async () => {
    const parser = createHarness().parser;
    const parsed = await parser.parseFile(csv(
      'Pays;Ville;Arrondissement;Secteur;Quartier;Latitude;Longitude\n' +
      'Burkina Faso;;;;Secteur 1;;\n' +
      'Burkina Faso;Ouagadougou;;;;;\n' +
      'Burkina Faso;Ouagadougou;;;;;',
    ));

    const analysis = parser.analyze(parsed, []);

    expect(analysis.rows[0].severity).toBe('error');
    expect(analysis.rows[0].message).toContain('Relation territoriale invalide');
    expect(analysis.statistics.duplicates).toBe(1);
    expect(analysis.rows[2].status).toBe('DUPLICATE_IN_FILE');
  });

  it('enregistre puis recharge le référentiel avant de confirmer un import complet', async () => {
    const harness = createHarness();
    const draft = draftFor(harness.parser);

    const result = await harness.parser.confirmImport(draft.id);

    expect(result.verified).toBeTrue();
    expect(result.retryableErrors).toBe(0);
    expect(result.created).toBe(2);
    expect(result.errors).toBe(0);
    expect(result.rows[0].status).toBe('VERIFIED');
    expect(harness.territory.loadApiUnits).toHaveBeenCalledTimes(2);
    expect(harness.persisted.map((unit) => unit.type_code)).toEqual(['COUNTRY', 'CITY']);
  });

  it('reporte les erreurs API partielles et ne recrée pas le parent au nouvel essai', async () => {
    const harness = createHarness({ failCityOnce: true });
    const draft = draftFor(harness.parser, `partial-${Date.now()}`);

    const first = await harness.parser.confirmImport(draft.id);
    expect(first.verified).toBeTrue();
    expect(first.created).toBe(1);
    expect(first.retryableErrors).toBe(1);
    expect(first.rows[0].severity).toBe('error');

    const second = await harness.parser.confirmImport(draft.id);
    expect(second.verified).toBeTrue();
    expect(second.retryableErrors).toBe(0);
    expect(second.errors).toBe(0);
    expect(harness.api.createCountry).toHaveBeenCalledTimes(1);
    expect(harness.getCityAttempts()).toBe(2);
  });

  it('reconnaît une création persistée malgré une réponse API perdue et évite le doublon', async () => {
    const harness = createHarness({ loseCityResponseOnce: true });
    const draft = draftFor(harness.parser, `lost-response-${Date.now()}`);

    const result = await harness.parser.confirmImport(draft.id);
    const retry = await harness.parser.confirmImport(draft.id);

    expect(result.verified).toBeTrue();
    expect(result.retryableErrors).toBe(0);
    expect(result.rows[0].status).toBe('VERIFIED');
    expect(harness.persisted.map((unit) => unit.type_code)).toEqual(['COUNTRY', 'CITY']);
    expect(harness.api.createCountry).toHaveBeenCalledTimes(1);
    expect(harness.api.createCity).toHaveBeenCalledTimes(1);
    expect(retry).toEqual(result);
  });

  it('ne renvoie pas une écriture incertaine si les relectures sont incomplètes', async () => {
    const harness = createHarness({
      loseCityResponseOnce: true,
      hideCityOnLoads: [2, 3, 4],
    });
    const draft = draftFor(harness.parser, `incomplete-read-${Date.now()}`);

    const first = await harness.parser.confirmImport(draft.id);
    expect(first.retryableErrors).toBe(1);

    const second = await harness.parser.confirmImport(draft.id);
    expect(second.retryableErrors).toBe(1);
    expect(harness.getCityAttempts()).toBe(1);

    const third = await harness.parser.confirmImport(draft.id);
    expect(third.verified).toBeTrue();
    expect(third.retryableErrors).toBe(0);
    expect(third.rows[0].status).toBe('REUSE');
    expect(harness.getCityAttempts()).toBe(1);
    expect(harness.persisted.filter((unit) => unit.type_code === 'CITY').length).toBe(1);
  });

  it('ne confirme pas une ligne dont la création API échoue', async () => {
    const harness = createHarness();
    (harness.api.createCountry as jasmine.Spy).and.returnValue(
      throwError(() => new Error('Accès refusé')),
    );
    const draft = draftFor(harness.parser, `api-error-${Date.now()}`);

    const result = await harness.parser.confirmImport(draft.id);

    expect(result.verified).toBeTrue();
    expect(result.retryableErrors).toBe(1);
    expect(result.rows[0].message).toContain('Accès refusé');
    expect(result.created).toBe(0);
  });
});
