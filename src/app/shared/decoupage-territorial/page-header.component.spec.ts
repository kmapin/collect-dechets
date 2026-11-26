import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<PageHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { getCurrentUser: () => ({ role: 'super_admin' }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeaderComponent);
  });

  it('shows a breadcrumb above the title with a link back to territorial units', () => {
    fixture.componentRef.setInput('title', 'Détail du secteur');
    fixture.detectChanges();

    const header = (fixture.nativeElement as HTMLElement).querySelector('header');
    const breadcrumbWrapper = header?.querySelector('.page-layout-breadcrumb');
    const breadcrumb = header?.querySelector('app-breadcrumb');
    const title = header?.querySelector('h1');
    const links = breadcrumb?.querySelectorAll<HTMLAnchorElement>('.app-breadcrumb__link');

    expect(breadcrumb?.textContent).toContain('Tableau de bord');
    expect(breadcrumb?.textContent).toContain('Unités territoriales');
    expect(breadcrumb?.textContent).toContain('Détail du secteur');
    expect(header?.firstElementChild).toBe(breadcrumbWrapper);
    expect(links?.[0].getAttribute('href')).toBe('/dashboard/admin');
    expect(links?.[1].getAttribute('href')).toBe('/territorial/units');
    expect(title?.textContent).toContain('Détail du secteur');
  });

  it('returns to the import page from the import preview breadcrumb', () => {
    fixture.componentRef.setInput('title', "Prévisualisation de l'import");
    fixture.detectChanges();

    const links = (fixture.nativeElement as HTMLElement)
      .querySelectorAll<HTMLAnchorElement>('.app-breadcrumb__link');

    expect(links[1].getAttribute('href')).toBe('/territorial/import');
  });
});
