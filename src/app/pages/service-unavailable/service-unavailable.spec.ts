import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ServiceUnavailable } from './service-unavailable';
import { TERRITORIAL_IMPORT_RETURN_URL_KEY } from '../../core/territorial-import-return';

describe('ServiceUnavailable', () => {
  let fixture: ComponentFixture<ServiceUnavailable>;
  let router: { navigateByUrl: jasmine.Spy };

  beforeEach(() => {
    sessionStorage.removeItem(TERRITORIAL_IMPORT_RETURN_URL_KEY);
    router = { navigateByUrl: jasmine.createSpy().and.resolveTo(true) };
    TestBed.configureTestingModule({
      imports: [ServiceUnavailable],
      providers: [{ provide: Router, useValue: router }],
    });
  });

  afterEach(() => {
    fixture?.destroy();
    sessionStorage.removeItem(TERRITORIAL_IMPORT_RETURN_URL_KEY);
  });

  it('propose de revenir au brouillon sans le supprimer', () => {
    const draftId = 'draft-123';
    const draftKey = `territorial-import-draft:${draftId}`;
    sessionStorage.setItem(TERRITORIAL_IMPORT_RETURN_URL_KEY, `/territorial/import/${draftId}/preview`);
    sessionStorage.setItem(draftKey, '{"id":"draft-123"}');

    fixture = TestBed.createComponent(ServiceUnavailable);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Aucune écriture incertaine ne sera relancée automatiquement.');
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const returnButton = Array.from(buttons)
      .find((button) => button.textContent?.includes('Revenir à l’import interrompu'));
    expect(returnButton).toBeTruthy();

    returnButton?.click();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith(`/territorial/import/${draftId}/preview`);
    expect(sessionStorage.getItem(TERRITORIAL_IMPORT_RETURN_URL_KEY)).toBeNull();
    expect(sessionStorage.getItem(draftKey)).toBe('{"id":"draft-123"}');
  });

  it('ignore et efface une URL de retour qui ne cible pas un aperçu territorial', () => {
    sessionStorage.setItem(TERRITORIAL_IMPORT_RETURN_URL_KEY, 'https://example.com');

    fixture = TestBed.createComponent(ServiceUnavailable);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Revenir à l’import interrompu');
    expect(sessionStorage.getItem(TERRITORIAL_IMPORT_RETURN_URL_KEY)).toBeNull();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
