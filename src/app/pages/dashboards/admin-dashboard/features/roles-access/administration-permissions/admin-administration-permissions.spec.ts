import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminAdministrationPermissions } from './admin-administration-permissions';
import { AgencyService } from '../../../../../../services/agency.service';
import { AuthService } from '../../../../../../services/auth.service';
import { NotificationService } from '../../../../../../services/notification.service';
import { ManagerRoleAccessListService } from '../shared/manager-role-access-list.service';
import { ManagerRoleAccess } from '../shared/manager-role-access.model';

describe('AdminAdministrationPermissions (onglet Permissions Administration — managers, toutes agences)', () => {
  let listeServiceSpy: jasmine.SpyObj<ManagerRoleAccessListService>;
  let agencyServiceSpy: jasmine.SpyObj<AgencyService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const managers: ManagerRoleAccess[] = [
    { idUtilisateur: 'm1', identifiants: 'Awa Traoré', agencyId: 'agence-A', agenceNom: 'Agence A', financialRole: null, droitsFinance: false, financePermissions: [], administrationPermissions: ['employees.view'] },
    { idUtilisateur: 'm2', identifiants: 'Zongo Issa', agencyId: 'agence-B', agenceNom: 'Agence B', financialRole: null, droitsFinance: false, financePermissions: [], administrationPermissions: [] },
  ];

  function construire(options: { currentUser?: any } = {}): AdminAdministrationPermissions {
    const { currentUser = { _id: 'super', role: 'super_admin' } } = options;

    listeServiceSpy = jasmine.createSpyObj('ManagerRoleAccessListService', ['charger']);
    listeServiceSpy.charger.and.returnValue(of(managers));
    agencyServiceSpy = jasmine.createSpyObj('AgencyService', ['setEmployeeAdministrationPermissions$']);
    notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authServiceSpy.getCurrentUser.and.returnValue(currentUser);

    TestBed.configureTestingModule({
      providers: [
        { provide: ManagerRoleAccessListService, useValue: listeServiceSpy },
        { provide: AgencyService, useValue: agencyServiceSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    return TestBed.runInInjectionContext(() => new AdminAdministrationPermissions());
  }

  it('charge via la liste partagée et sélectionne le premier manager', () => {
    const composant = construire();
    expect(listeServiceSpy.charger).toHaveBeenCalled();
    expect(composant.utilisateurs().length).toBe(2);
    expect(composant.utilisateurSelectionne()?.idUtilisateur).toBe('m1');
    expect(composant.estCoche('employees.view' as any)).toBe(true);
  });

  it('recherche filtre aussi par nom d\'agence', () => {
    const composant = construire();
    composant.recherche.set('agence b');
    expect(composant.utilisateursFiltres().map((u) => u.identifiants)).toEqual(['Zongo Issa']);
  });

  it('enregistrer transmet le brouillon et l\'agencyId de la cible sélectionnée', () => {
    const composant = construire();
    agencyServiceSpy.setEmployeeAdministrationPermissions$.and.returnValue(of({}));
    composant.basculerPermission('employees.create' as any);
    composant.enregistrer();
    expect(agencyServiceSpy.setEmployeeAdministrationPermissions$).toHaveBeenCalledWith(
      'm1',
      jasmine.arrayContaining(['employees.view', 'employees.create']),
      'agence-A',
    );
  });

  it("peutModifier() est false sur l'appelant lui-même (anti auto-escalade, même en super_admin)", () => {
    const composant = construire({ currentUser: { _id: 'm1', role: 'super_admin' } });
    expect(composant.peutModifier()).toBe(false);
  });

  it('appliquerPreregleEmployes() peuple le brouillon avec les 4 clés employees.* (même préréglage que le select rapide du tableau Utilisateurs)', () => {
    const composant = construire();
    composant.appliquerPreregleEmployes();
    expect(composant.estCoche('employees.view' as any)).toBe(true);
    expect(composant.estCoche('employees.create' as any)).toBe(true);
    expect(composant.estCoche('employees.update' as any)).toBe(true);
    expect(composant.estCoche('employees.delete' as any)).toBe(true);
    expect(composant.estCoche('roles.view' as any)).toBe(false);
    expect(composant.modifie()).toBe(true);
  });

  it('appliquerPreregleEmployesEtRoles() peuple le brouillon avec les 6 clés, y compris roles.view/roles.manage', () => {
    const composant = construire();
    composant.appliquerPreregleEmployesEtRoles();
    expect(composant.estCoche('roles.view' as any)).toBe(true);
    expect(composant.estCoche('roles.manage' as any)).toBe(true);
    expect(composant.estCoche('employees.view' as any)).toBe(true);
  });

  it("les préréglages n'ont aucun effet si l'appelant ne peut pas modifier (ex. cible = soi-même)", () => {
    const composant = construire({ currentUser: { _id: 'm1', role: 'super_admin' } });
    composant.appliquerPreregleEmployesEtRoles();
    expect(composant.modifie()).toBe(false);
  });

  it('les préréglages ne sont pas encore enregistrés tant que enregistrer() n\'est pas appelé', () => {
    const composant = construire();
    agencyServiceSpy.setEmployeeAdministrationPermissions$.and.returnValue(of({}));
    composant.appliquerPreregleEmployesEtRoles();
    expect(agencyServiceSpy.setEmployeeAdministrationPermissions$).not.toHaveBeenCalled();
    composant.enregistrer();
    expect(agencyServiceSpy.setEmployeeAdministrationPermissions$).toHaveBeenCalledWith(
      'm1',
      jasmine.arrayContaining(['employees.view', 'employees.create', 'employees.update', 'employees.delete', 'roles.view', 'roles.manage']),
      'agence-A',
    );
  });

  it('super_admin a toujours peutGerer (bypass explicite rôle==="super_admin")', () => {
    const composant = construire();
    expect(composant.peutGerer).toBe(true);
  });

  it("aucune section finance dans ce composant (pas de changerRole/basculerDroitsFinance)", () => {
    const composant = construire();
    expect((composant as any).changerRole).toBeUndefined();
    expect((composant as any).basculerDroitsFinance).toBeUndefined();
  });
});

describe('AdminAdministrationPermissions — via le DOM réel', () => {
  let fixture: ComponentFixture<AdminAdministrationPermissions>;

  const managers: ManagerRoleAccess[] = [
    { idUtilisateur: 'm1', identifiants: 'Awa Traoré', agencyId: 'agence-A', agenceNom: 'Agence A', financialRole: null, droitsFinance: false, financePermissions: [], administrationPermissions: [] },
    { idUtilisateur: 'm2', identifiants: 'Zongo Issa', agencyId: 'agence-B', agenceNom: 'Agence B', financialRole: null, droitsFinance: false, financePermissions: [], administrationPermissions: [] },
  ];

  beforeEach(() => {
    const listeServiceSpy = jasmine.createSpyObj('ManagerRoleAccessListService', ['charger']);
    listeServiceSpy.charger.and.returnValue(of(managers));
    const agencyServiceSpy = jasmine.createSpyObj('AgencyService', ['setEmployeeAdministrationPermissions$']);
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authServiceSpy.getCurrentUser.and.returnValue({ _id: 'super', role: 'super_admin' });

    TestBed.configureTestingModule({
      providers: [
        { provide: ManagerRoleAccessListService, useValue: listeServiceSpy },
        { provide: AgencyService, useValue: agencyServiceSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    fixture = TestBed.createComponent(AdminAdministrationPermissions);
    fixture.detectChanges();
  });

  it("n'affiche aucun contenu finance (pas de rôle financier, cet onglet est séparé)", () => {
    expect(fixture.nativeElement.textContent).not.toContain('Rôle financier');
    expect(fixture.nativeElement.textContent).toContain('Employés');
  });

  it('taper dans le champ de recherche filtre la liste réelle', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.access-mgmt__search input');
    input.value = 'zongo';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const noms = Array.from(fixture.nativeElement.querySelectorAll('.access-mgmt__list li .name')).map((el: any) => el.textContent.trim());
    expect(noms).toEqual(['Zongo Issa']);
  });

  it('les deux boutons de préréglage sont présents, et cliquer sur "Gérer les employés + rôles" coche roles.manage dans le vrai DOM', () => {
    const boutons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('.detail-actions__ghost'));
    const boutonEmployesRoles = boutons.find((b) => b.textContent?.includes('Gérer les employés + rôles'));
    expect(boutons.some((b) => b.textContent?.trim() === 'Gérer les employés')).toBe(true);
    expect(boutonEmployesRoles).withContext('bouton "Gérer les employés + rôles" introuvable').toBeTruthy();

    boutonEmployesRoles!.click();
    fixture.detectChanges();

    const caseRolesManage: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Autoriser : Gérer les rôles & accès du personnel"]');
    expect(caseRolesManage.classList).toContain('checked');
  });
});
