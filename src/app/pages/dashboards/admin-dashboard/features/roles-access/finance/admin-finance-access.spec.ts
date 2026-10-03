import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminFinanceAccess } from './admin-finance-access';
import { AgencyService } from '../../../../../../services/agency.service';
import { NotificationService } from '../../../../../../services/notification.service';
import { ManagerRoleAccessListService } from '../shared/manager-role-access-list.service';
import { ManagerRoleAccess } from '../shared/manager-role-access.model';
import { Role } from '../../../../financial-dashboard/models';

describe('AdminFinanceAccess (onglet Droits financiers — managers, toutes agences)', () => {
  let listeServiceSpy: jasmine.SpyObj<ManagerRoleAccessListService>;
  let agencyServiceSpy: jasmine.SpyObj<AgencyService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;

  const managers: ManagerRoleAccess[] = [
    { idUtilisateur: 'm1', identifiants: 'Awa Traoré', agencyId: 'agence-A', agenceNom: 'Agence A', financialRole: Role.ADMINISTRATEUR, droitsFinance: true, financePermissions: ['transactions.view'] as any, administrationPermissions: ['roles.view'] },
    { idUtilisateur: 'm2', identifiants: 'Zongo Issa', agencyId: 'agence-B', agenceNom: 'Agence B', financialRole: null, droitsFinance: false, financePermissions: [], administrationPermissions: [] },
  ];

  function construire(): AdminFinanceAccess {
    listeServiceSpy = jasmine.createSpyObj('ManagerRoleAccessListService', ['charger']);
    listeServiceSpy.charger.and.returnValue(of(managers));
    agencyServiceSpy = jasmine.createSpyObj('AgencyService', [
      'setEmployeeFinancialRole$', 'toggleEmployeeDroitsFinance$', 'setEmployeeFinancePermissions$',
    ]);
    notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ManagerRoleAccessListService, useValue: listeServiceSpy },
        { provide: AgencyService, useValue: agencyServiceSpy },
        { provide: NotificationService, useValue: notificationSpy },
      ],
    });

    return TestBed.runInInjectionContext(() => new AdminFinanceAccess());
  }

  it('charge via la liste partagée et sélectionne le premier manager', () => {
    const composant = construire();
    expect(listeServiceSpy.charger).toHaveBeenCalled();
    expect(composant.utilisateurs().length).toBe(2);
    expect(composant.utilisateurSelectionne()?.idUtilisateur).toBe('m1');
  });

  it('recherche filtre aussi par nom d\'agence', () => {
    const composant = construire();
    composant.recherche.set('agence b');
    expect(composant.utilisateursFiltres().map((u) => u.identifiants)).toEqual(['Zongo Issa']);
  });

  it('changerRole transmet explicitement l\'agencyId de la ligne', () => {
    const composant = construire();
    agencyServiceSpy.setEmployeeFinancialRole$.and.returnValue(of({}));
    const m1 = composant.utilisateurs()[0];
    composant.changerRole(m1, Role.COMPTABLE);
    expect(agencyServiceSpy.setEmployeeFinancialRole$).toHaveBeenCalledWith('m1', 'comptable', 'agence-A');
  });

  it('changerRole(u, null) retire le rôle financier (option "Aucun", équivalente au select rapide du tableau Utilisateurs)', () => {
    const composant = construire();
    agencyServiceSpy.setEmployeeFinancialRole$.and.returnValue(of({}));
    const m1 = composant.utilisateurs()[0];
    composant.changerRole(m1, null);
    expect(agencyServiceSpy.setEmployeeFinancialRole$).toHaveBeenCalledWith('m1', null, 'agence-A');
    expect(notificationSpy.showSuccess).toHaveBeenCalledWith('Rôle mis à jour', jasmine.stringMatching(/retiré/));
  });

  it('basculerDroitsFinance transmet explicitement l\'agencyId de la ligne', () => {
    const composant = construire();
    agencyServiceSpy.toggleEmployeeDroitsFinance$.and.returnValue(of({ droitsFinance: false }));
    const m1 = composant.utilisateurs()[0];
    composant.basculerDroitsFinance(m1);
    expect(agencyServiceSpy.toggleEmployeeDroitsFinance$).toHaveBeenCalledWith('m1', 'agence-A');
  });

  it('enregistrer transmet le brouillon et l\'agencyId de la cible sélectionnée', () => {
    const composant = construire();
    agencyServiceSpy.setEmployeeFinancePermissions$.and.returnValue(of({}));
    composant.basculerPermission('transactions.create' as any);
    composant.enregistrer();
    expect(agencyServiceSpy.setEmployeeFinancePermissions$).toHaveBeenCalledWith(
      'm1',
      jasmine.arrayContaining(['transactions.view', 'transactions.create']),
      'agence-A',
    );
  });

  it('un rôle Administrateur implique les clés de gouvernance (non décochables) même sans les avoir dans le brouillon', () => {
    const composant = construire();
    expect(composant.estImplicite('roles.view' as any)).toBe(true);
    expect(composant.estCoche('roles.view' as any)).toBe(true);
  });

  it('aucune section Administration dans ce composant (pas de peutModifierAdministration, pas de administrationPermissions exposé en modification)', () => {
    const composant = construire();
    expect((composant as any).enregistrerAdministration).toBeUndefined();
    expect((composant as any).peutModifierAdministration).toBeUndefined();
  });
});

describe('AdminFinanceAccess — via le DOM réel', () => {
  let fixture: ComponentFixture<AdminFinanceAccess>;

  const managers: ManagerRoleAccess[] = [
    { idUtilisateur: 'm1', identifiants: 'Awa Traoré', agencyId: 'agence-A', agenceNom: 'Agence A', financialRole: null, droitsFinance: false, financePermissions: [], administrationPermissions: [] },
    { idUtilisateur: 'm2', identifiants: 'Zongo Issa', agencyId: 'agence-B', agenceNom: 'Agence B', financialRole: null, droitsFinance: false, financePermissions: [], administrationPermissions: [] },
  ];

  beforeEach(() => {
    const listeServiceSpy = jasmine.createSpyObj('ManagerRoleAccessListService', ['charger']);
    listeServiceSpy.charger.and.returnValue(of(managers));
    const agencyServiceSpy = jasmine.createSpyObj('AgencyService', [
      'setEmployeeFinancialRole$', 'toggleEmployeeDroitsFinance$', 'setEmployeeFinancePermissions$',
    ]);
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);

    TestBed.configureTestingModule({
      providers: [
        { provide: ManagerRoleAccessListService, useValue: listeServiceSpy },
        { provide: AgencyService, useValue: agencyServiceSpy },
        { provide: NotificationService, useValue: notificationSpy },
      ],
    });

    fixture = TestBed.createComponent(AdminFinanceAccess);
    fixture.detectChanges();
  });

  it("n'affiche aucun contenu Administration (pas de titre de domaine, cet onglet est séparé)", () => {
    expect(fixture.nativeElement.textContent).not.toContain('Permissions Administration');
    expect(fixture.nativeElement.textContent).toContain('Rôle attribué');
  });

  it('taper dans le champ de recherche filtre la liste réelle', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.access-mgmt__search input');
    input.value = 'zongo';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    const noms = Array.from(fixture.nativeElement.querySelectorAll('.access-mgmt__list li .name')).map((el: any) => el.textContent.trim());
    expect(noms).toEqual(['Zongo Issa']);
  });

  it('un bouton "Aucun" permet de retirer le rôle financier depuis le vrai DOM', () => {
    expect(fixture.nativeElement.textContent).toContain('Aucun');
    const boutonAucun: HTMLButtonElement = fixture.nativeElement.querySelector('[aria-label="Retirer le rôle financier"]');
    expect(boutonAucun).withContext('bouton "Aucun" introuvable dans le tableau Rôle attribué').toBeTruthy();
  });
});
