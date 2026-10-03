import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdministrationPermissions } from './administration-permissions';
import { AdministrationUsersService, UtilisateurAdministration } from '../services/administration-users.service';
import { NotificationService } from '../../../../../../services/notification.service';
import { AuthService } from '../../../../../../services/auth.service';

describe('AdministrationPermissions (écran dédié, sans contenu finance)', () => {
  let administrationUsersSpy: jasmine.SpyObj<AdministrationUsersService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const utilisateurs: UtilisateurAdministration[] = [
    { idUtilisateur: 'u1', identifiants: 'Zongo Zongo', role: 'manager', permissions: ['employees.view'] },
    { idUtilisateur: 'u2', identifiants: 'Awa Traoré', role: 'collector', permissions: [] },
    { idUtilisateur: 'u3', identifiants: 'Zongo Issa', role: 'collector', permissions: [] },
  ];

  function construire(options: { liste?: UtilisateurAdministration[]; currentUser?: any } = {}): AdministrationPermissions {
    const { liste = utilisateurs, currentUser = { _id: 'moi', role: 'manager', administrationPermissions: ['roles.manage'] } } = options;

    administrationUsersSpy = jasmine.createSpyObj('AdministrationUsersService', ['getUtilisateurs', 'setPermissions']);
    administrationUsersSpy.getUtilisateurs.and.returnValue(of(liste));
    notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authServiceSpy.getCurrentUser.and.returnValue(currentUser);

    TestBed.configureTestingModule({
      providers: [
        { provide: AdministrationUsersService, useValue: administrationUsersSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    return TestBed.runInInjectionContext(() => new AdministrationPermissions());
  }

  it('charge la liste et sélectionne automatiquement le premier utilisateur (ordre alphabétique : Awa Traoré avant Zongo)', () => {
    const composant = construire();
    expect(composant.utilisateurs().length).toBe(3);
    expect(composant.chargement()).toBe(false);
    expect(composant.utilisateurSelectionne()?.idUtilisateur).toBe('u2');
    expect(composant.estCoche('employees.view' as any)).toBe(false);
  });

  it('recherche : un terme qui correspond à plusieurs utilisateurs les garde tous', () => {
    const composant = construire();
    composant.recherche.set('zongo');
    const noms = composant.utilisateursFiltres().map((u) => u.identifiants);
    expect(noms).toEqual(jasmine.arrayContaining(['Zongo Zongo', 'Zongo Issa']));
    expect(noms).not.toContain('Awa Traoré');
  });

  it('filtre par rôle : "collector" ne garde que les collecteurs', () => {
    const composant = construire();
    composant.filtreRole.set('collector');
    const noms = composant.utilisateursFiltres().map((u) => u.identifiants);
    expect(noms.length).toBe(2);
    expect(noms).toEqual(jasmine.arrayContaining(['Awa Traoré', 'Zongo Issa']));
  });

  it('basculerPermission ajoute/retire la clé du brouillon et modifie() détecte le changement', () => {
    const composant = construire();
    expect(composant.modifie()).toBe(false);
    composant.basculerPermission('employees.create' as any);
    expect(composant.estCoche('employees.create' as any)).toBe(true);
    expect(composant.modifie()).toBe(true);
  });

  it('annuler restaure le brouillon aux permissions enregistrées', () => {
    const composant = construire();
    composant.basculerPermission('employees.create' as any);
    composant.annuler();
    expect(composant.modifie()).toBe(false);
    expect(composant.estCoche('employees.create' as any)).toBe(false);
  });

  it('enregistrer appelle AdministrationUsersService.setPermissions avec le bon id et le bon brouillon', () => {
    const composant = construire();
    administrationUsersSpy.setPermissions.and.returnValue(of(utilisateurs[0]));
    composant.selectionner(utilisateurs[0]); // u1 (Zongo Zongo), explicite plutôt que de dépendre du tri alphabétique
    composant.basculerPermission('employees.create' as any);
    composant.enregistrer();
    expect(administrationUsersSpy.setPermissions).toHaveBeenCalledWith(
      'u1',
      jasmine.arrayContaining(['employees.view', 'employees.create']),
    );
    expect(notificationSpy.showSuccess).toHaveBeenCalled();
  });

  it("peutModifier() est false sur l'utilisateur appelant lui-même (anti auto-escalade)", () => {
    const composant = construire({ currentUser: { _id: 'u1', role: 'manager', administrationPermissions: ['roles.manage'] } });
    composant.selectionner(utilisateurs[0]); // se sélectionner soi-même (u1)
    expect(composant.peutModifier()).toBe(false);
  });

  it('peutModifier() est false sur une cible super_admin', () => {
    const listeAvecSuperAdmin: UtilisateurAdministration[] = [
      { idUtilisateur: 'u1', identifiants: 'Super Admin', role: 'super_admin', permissions: [] },
    ];
    const composant = construire({ liste: listeAvecSuperAdmin });
    expect(composant.peutModifier()).toBe(false);
  });

  it("peutModifier() est false si l'appelant n'a pas roles.manage", () => {
    const composant = construire({ currentUser: { _id: 'moi', role: 'manager', administrationPermissions: [] } });
    expect(composant.peutModifier()).toBe(false);
  });

  it('erreur de chargement (403) : chargement se termine quand même (pas de spinner infini)', () => {
    administrationUsersSpy = jasmine.createSpyObj('AdministrationUsersService', ['getUtilisateurs', 'setPermissions']);
    administrationUsersSpy.getUtilisateurs.and.returnValue(throwError(() => new Error('403')));
    notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authServiceSpy.getCurrentUser.and.returnValue({ _id: 'moi', role: 'manager', administrationPermissions: [] } as any);
    TestBed.configureTestingModule({
      providers: [
        { provide: AdministrationUsersService, useValue: administrationUsersSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });
    // Ne doit pas lever d'exception non gérée (subscribe error géré) — le test échoue
    // sinon avec une erreur Jasmine non interceptée.
    expect(() => TestBed.runInInjectionContext(() => new AdministrationPermissions())).not.toThrow();
  });
});

describe('AdministrationPermissions — via le DOM réel (fixture + détection de changements)', () => {
  let administrationUsersSpy: jasmine.SpyObj<AdministrationUsersService>;
  let fixture: ComponentFixture<AdministrationPermissions>;

  const utilisateurs: UtilisateurAdministration[] = [
    { idUtilisateur: 'u1', identifiants: 'Zongo Zongo', role: 'manager', permissions: [] },
    { idUtilisateur: 'u2', identifiants: 'Awa Traoré', role: 'collector', permissions: [] },
  ];

  beforeEach(() => {
    administrationUsersSpy = jasmine.createSpyObj('AdministrationUsersService', ['getUtilisateurs', 'setPermissions']);
    administrationUsersSpy.getUtilisateurs.and.returnValue(of(utilisateurs));
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authServiceSpy.getCurrentUser.and.returnValue({ _id: 'moi', role: 'manager', administrationPermissions: ['roles.manage'] });

    TestBed.configureTestingModule({
      providers: [
        { provide: AdministrationUsersService, useValue: administrationUsersSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    fixture = TestBed.createComponent(AdministrationPermissions);
    fixture.detectChanges();
  });

  it('affiche les 2 utilisateurs au chargement initial, sans aucun contenu financier', () => {
    const noms = Array.from(fixture.nativeElement.querySelectorAll('.access-mgmt__list li .name')).map(
      (el: any) => el.textContent.trim(),
    );
    expect(noms.length).toBe(2);
    expect(fixture.nativeElement.textContent).not.toContain('Droits financiers');
    expect(fixture.nativeElement.textContent).not.toContain('financier');
  });

  it('taper dans le champ de recherche filtre la liste réelle', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.access-mgmt__search input');
    input.value = 'awa';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const noms = Array.from(fixture.nativeElement.querySelectorAll('.access-mgmt__list li .name')).map(
      (el: any) => el.textContent.trim(),
    );
    expect(noms).toEqual(['Awa Traoré']);
  });
});
