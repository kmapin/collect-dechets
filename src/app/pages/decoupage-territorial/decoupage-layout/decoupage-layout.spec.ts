import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DecoupageLayout } from './decoupage-layout';
import { DECOUPAGE_TERRITORIAL_ROUTES } from '../decoupage-territorial.routes';

describe('DecoupageLayout', () => {
  let component: DecoupageLayout;
  let fixture: ComponentFixture<DecoupageLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecoupageLayout],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(DecoupageLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('redirige les anciennes URL sans désactiver l’import ni sa prévisualisation', () => {
    const routes = DECOUPAGE_TERRITORIAL_ROUTES[0].children ?? [];
    const historyRoute = routes.find((route) => route.path === 'import/history');
    const auditRoute = routes.find((route) => route.path === 'audit');

    expect(historyRoute?.redirectTo).toBe('import');
    expect(auditRoute?.redirectTo).toBe('units');
    expect(routes.some((route) => route.path === 'import' && route.component)).toBeTrue();
    expect(routes.some((route) => route.path === 'import/:id/preview' && route.component)).toBeTrue();
  });
});
