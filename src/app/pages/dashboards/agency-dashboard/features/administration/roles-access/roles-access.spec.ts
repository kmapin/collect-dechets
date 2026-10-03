import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RolesAccess } from './roles-access';
import { SESSION_SERVICE } from '../../../../financial-dashboard/data-access/tokens/session.token';
import { AdministrationUsersService, UtilisateurAdministration } from '../services/administration-users.service';
import { NotificationService } from '../../../../../../services/notification.service';
import { AuthService } from '../../../../../../services/auth.service';
import { Role, Utilisateur } from '../../../../financial-dashboard/models';
import { SessionService } from '../../../../financial-dashboard/data-access/contracts/session.service';

describe('RolesAccess (écran fusionné Finance + Administration)', () => {
  let sessionSpy: jasmine.SpyObj<SessionService>;
  let administrationUsersSpy: jasmine.SpyObj<AdministrationUsersService>;
  let notificationSpy: jasmine.SpyObj<NotificationService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const utilisateurFinance: Utilisateur = {
    idUtilisateur: 'u1',
    identifiants: 'alice@agence.com',
    role: Role.COMPTABLE,
    droitsFinance: true,
    permissions: ['transactions.view' as any],
  };

  const utilisateurAdministration: UtilisateurAdministration = {
    idUtilisateur: 'u1',
    identifiants: 'alice@agence.com',
    role: 'manager',
    permissions: ['employees.view'],
  };

  function construire(options: {
    financeOk?: boolean;
    administrationOk?: boolean;
    currentUser?: any;
  } = {}): RolesAccess {
    const { financeOk = true, administrationOk = true, currentUser = { _id: 'moi', role: 'manager', administrationPermissions: ['roles.manage'] } } = options;

    sessionSpy = jasmine.createSpyObj<SessionService>('SessionService', [
      'getUtilisateurs',
      'toggleDroitsFinance',
      'setFinancialRole',
      'setPermissions',
    ]);
    sessionSpy.getUtilisateurs.and.returnValue(
      financeOk ? of([utilisateurFinance]) : throwError(() => new Error('403')),
    );

    administrationUsersSpy = jasmine.createSpyObj('AdministrationUsersService', ['getUtilisateurs', 'setPermissions']);
    administrationUsersSpy.getUtilisateurs.and.returnValue(
      administrationOk ? of([utilisateurAdministration]) : throwError(() => new Error('403')),
    );

    notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authServiceSpy.getCurrentUser.and.returnValue(currentUser);

    TestBed.configureTestingModule({
      providers: [
        { provide: SESSION_SERVICE, useValue: sessionSpy },
        { provide: AdministrationUsersService, useValue: administrationUsersSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    return TestBed.runInInjectionContext(() => new RolesAccess());
  }

  // ── Affichage des permissions / fusion des deux listes ──────────────────────────
  describe('chargement et fusion des listes (affichage des permissions)', () => {
    it('fusionne un utilisateur présent dans les deux domaines en une seule ligne par idUtilisateur', () => {
      const composant = construire();
      expect(composant.utilisateurs().length).toBe(1);
      const u = composant.utilisateurs()[0];
      expect(u.finance).toEqual(utilisateurFinance);
      expect(u.administration).toEqual(utilisateurAdministration);
      expect(composant.chargement()).toBe(false);
    });

    it('sélectionne automatiquement le premier utilisateur après chargement et affiche ses permissions', () => {
      const composant = construire();
      expect(composant.utilisateurSelectionne()?.idUtilisateur).toBe('u1');
      expect(composant.estCocheFinance('transactions.view' as any)).toBe(true);
      expect(composant.estCocheAdministration('employees.view' as any)).toBe(true);
      expect(composant.estCocheAdministration('employees.delete' as any)).toBe(false);
    });

    it('accès finance disponible mais administration en échec (403) -> seule la section finance est exposée', () => {
      const composant = construire({ administrationOk: false });
      expect(composant.accesFinanceDisponible()).toBe(true);
      expect(composant.accesAdministrationDisponible()).toBe(false);
      expect(composant.utilisateurs()[0].administration).toBeNull();
    });

    it('accès administration disponible mais finance en échec (403) -> seule la section administration est exposée (préserve le fonctionnement si finance est indisponible)', () => {
      const composant = construire({ financeOk: false });
      expect(composant.accesFinanceDisponible()).toBe(false);
      expect(composant.accesAdministrationDisponible()).toBe(true);
      expect(composant.utilisateurs()[0].finance).toBeNull();
    });
  });

  // ── Recherche / filtre sur la liste Personnel ───────────────────────────────────
  describe('recherche et filtre rôle sur utilisateursFiltres()', () => {
    function construireAvecPlusieursUtilisateurs(): RolesAccess {
      const utilisateursAdmin: UtilisateurAdministration[] = [
        { idUtilisateur: 'u1', identifiants: 'Zongo Zongo', role: 'manager', permissions: [] },
        { idUtilisateur: 'u2', identifiants: 'Awa Traoré', role: 'collector', permissions: [] },
        { idUtilisateur: 'u3', identifiants: 'Zongo Issa', role: 'collector', permissions: [] },
      ];

      sessionSpy = jasmine.createSpyObj<SessionService>('SessionService', ['getUtilisateurs', 'toggleDroitsFinance', 'setFinancialRole', 'setPermissions']);
      sessionSpy.getUtilisateurs.and.returnValue(of([]));
      administrationUsersSpy = jasmine.createSpyObj('AdministrationUsersService', ['getUtilisateurs', 'setPermissions']);
      administrationUsersSpy.getUtilisateurs.and.returnValue(of(utilisateursAdmin));
      notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);
      authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
      authServiceSpy.getCurrentUser.and.returnValue({ _id: 'moi', role: 'manager', administrationPermissions: ['roles.manage'] } as any);

      TestBed.configureTestingModule({
        providers: [
          { provide: SESSION_SERVICE, useValue: sessionSpy },
          { provide: AdministrationUsersService, useValue: administrationUsersSpy },
          { provide: NotificationService, useValue: notificationSpy },
          { provide: AuthService, useValue: authServiceSpy },
        ],
      });
      return TestBed.runInInjectionContext(() => new RolesAccess());
    }

    it('sans recherche ni filtre, les 3 utilisateurs apparaissent', () => {
      const composant = construireAvecPlusieursUtilisateurs();
      expect(composant.utilisateursFiltres().length).toBe(3);
    });

    it('taper un terme qui correspond à plusieurs utilisateurs les garde tous (insensible à la casse)', () => {
      const composant = construireAvecPlusieursUtilisateurs();
      composant.recherche.set('zongo');
      const noms = composant.utilisateursFiltres().map((u) => u.identifiants);
      expect(noms).toEqual(jasmine.arrayContaining(['Zongo Zongo', 'Zongo Issa']));
      expect(noms).not.toContain('Awa Traoré');
    });

    it('taper un terme qui ne correspond à personne vide la liste (comportement attendu, pas un bug)', () => {
      const composant = construireAvecPlusieursUtilisateurs();
      composant.recherche.set('inexistant');
      expect(composant.utilisateursFiltres().length).toBe(0);
    });

    it('effacer la recherche (chaîne vide) réaffiche tout le monde', () => {
      const composant = construireAvecPlusieursUtilisateurs();
      composant.recherche.set('awa');
      expect(composant.utilisateursFiltres().length).toBe(1);
      composant.recherche.set('');
      expect(composant.utilisateursFiltres().length).toBe(3);
    });

    it('le filtre par rôle se combine avec la recherche texte', () => {
      const composant = construireAvecPlusieursUtilisateurs();
      composant.recherche.set('zongo');
      composant.filtreRole.set('collector');
      const noms = composant.utilisateursFiltres().map((u) => u.identifiants);
      expect(noms).toEqual(['Zongo Issa']);
    });
  });

  // ── Recherche via le vrai champ HTML (reproduit le signalement utilisateur :
  // "la recherche ne marche pas", liste vidée en tapant) — teste le DOM rendu, pas
  // seulement le signal utilisateursFiltres() en isolation.
  describe('recherche — via le DOM réel (fixture + détection de changements)', () => {
    let fixture: ComponentFixture<RolesAccess>;

    beforeEach(() => {
      const utilisateursAdmin: UtilisateurAdministration[] = [
        { idUtilisateur: 'u1', identifiants: 'Zongo Zongo', role: 'manager', permissions: [] },
        { idUtilisateur: 'u2', identifiants: 'Awa Traoré', role: 'collector', permissions: [] },
        { idUtilisateur: 'u3', identifiants: 'Zongo Issa', role: 'collector', permissions: [] },
      ];

      sessionSpy = jasmine.createSpyObj<SessionService>('SessionService', ['getUtilisateurs', 'toggleDroitsFinance', 'setFinancialRole', 'setPermissions']);
      sessionSpy.getUtilisateurs.and.returnValue(of([]));
      administrationUsersSpy = jasmine.createSpyObj('AdministrationUsersService', ['getUtilisateurs', 'setPermissions']);
      administrationUsersSpy.getUtilisateurs.and.returnValue(of(utilisateursAdmin));
      notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);
      authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
      authServiceSpy.getCurrentUser.and.returnValue({ _id: 'moi', role: 'manager', administrationPermissions: ['roles.manage'] } as any);

      TestBed.configureTestingModule({
        providers: [
          { provide: SESSION_SERVICE, useValue: sessionSpy },
          { provide: AdministrationUsersService, useValue: administrationUsersSpy },
          { provide: NotificationService, useValue: notificationSpy },
          { provide: AuthService, useValue: authServiceSpy },
        ],
      });

      fixture = TestBed.createComponent(RolesAccess);
      fixture.detectChanges();
    });

    function taper(valeur: string): void {
      const input: HTMLInputElement = fixture.nativeElement.querySelector('.access-mgmt__search input');
      input.value = valeur;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    function nomsAffiches(): string[] {
      return Array.from(fixture.nativeElement.querySelectorAll('.access-mgmt__list li .name')).map(
        (el: any) => el.textContent.trim(),
      );
    }

    it('affiche les 3 utilisateurs au chargement initial', () => {
      expect(nomsAffiches().length).toBe(3);
    });

    it('taper "zongo" dans le vrai champ garde les 2 utilisateurs correspondants (pas de liste vide)', () => {
      taper('zongo');
      const noms = nomsAffiches();
      expect(noms.length).toBe(2);
      expect(noms).toEqual(jasmine.arrayContaining(['Zongo Zongo', 'Zongo Issa']));
    });

    it('taper un terme sans correspondance affiche le message "Aucun utilisateur"', () => {
      taper('inexistant');
      expect(nomsAffiches().length).toBe(0);
      expect(fixture.nativeElement.querySelector('.access-mgmt__empty')).toBeTruthy();
    });

    function selectionnerRole(valeur: string): void {
      const select: HTMLSelectElement = fixture.nativeElement.querySelector('.access-mgmt__filter');
      select.value = valeur;
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    }

    it('sélectionner "Manager" dans le menu déroulant ne garde que le manager (via le vrai <select>)', () => {
      selectionnerRole('manager');
      expect(nomsAffiches()).toEqual(['Zongo Zongo']);
    });

    it('sélectionner "Collecteur" dans le menu déroulant ne garde que les collecteurs (via le vrai <select>)', () => {
      selectionnerRole('collector');
      const noms = nomsAffiches();
      expect(noms.length).toBe(2);
      expect(noms).toEqual(jasmine.arrayContaining(['Awa Traoré', 'Zongo Issa']));
    });

    it('revenir à "Rôle : Tous" (value="") réaffiche tout le monde', () => {
      selectionnerRole('collector');
      expect(nomsAffiches().length).toBe(2);
      selectionnerRole('');
      expect(nomsAffiches().length).toBe(3);
    });
  });

  // ── Bug signalé : filtre par rôle vide la liste quand l'appelant n'a que l'accès
  // FINANCE (pas d'accès Administration) — reproduit la capture d'écran utilisateur
  // (sélectionner "Manager" OU "Collecteur" renvoyait "Aucun utilisateur", même pour
  // un manager réellement présent). Cause : roleOperationnel vaut '' pour les entrées
  // venues uniquement du domaine Finance (il n'a pas ce champ), donc u.roleOperationnel
  // === 'manager'/'collector' ne matchait jamais personne.
  describe('filtre par rôle — appelant sans accès Administration (finance uniquement)', () => {
    let fixture: ComponentFixture<RolesAccess>;

    beforeEach(() => {
      sessionSpy = jasmine.createSpyObj<SessionService>('SessionService', ['getUtilisateurs', 'toggleDroitsFinance', 'setFinancialRole', 'setPermissions']);
      sessionSpy.getUtilisateurs.and.returnValue(of([utilisateurFinance]));
      administrationUsersSpy = jasmine.createSpyObj('AdministrationUsersService', ['getUtilisateurs', 'setPermissions']);
      administrationUsersSpy.getUtilisateurs.and.returnValue(throwError(() => new Error('403')));
      notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);
      authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
      authServiceSpy.getCurrentUser.and.returnValue({ _id: 'moi', role: 'manager', administrationPermissions: [], droitsFinance: true, financePermissions: ['roles.view'] } as any);

      TestBed.configureTestingModule({
        providers: [
          { provide: SESSION_SERVICE, useValue: sessionSpy },
          { provide: AdministrationUsersService, useValue: administrationUsersSpy },
          { provide: NotificationService, useValue: notificationSpy },
          { provide: AuthService, useValue: authServiceSpy },
        ],
      });

      fixture = TestBed.createComponent(RolesAccess);
      fixture.detectChanges();
    });

    it('accesAdministrationDisponible() est false et le sélecteur de rôle est masqué (plutôt que de filtrer sur un champ vide pour tout le monde)', () => {
      const composant = fixture.componentInstance;
      expect(composant.accesAdministrationDisponible()).toBe(false);
      expect(fixture.nativeElement.querySelector('.access-mgmt__filter')).toBeNull();
    });

    it("l'utilisateur finance-only reste visible et la recherche continue de fonctionner (pas de filtre rôle appliqué)", () => {
      const composant = fixture.componentInstance;
      expect(composant.utilisateursFiltres().length).toBe(1);

      const input: HTMLInputElement = fixture.nativeElement.querySelector('.access-mgmt__search input');
      input.value = 'alice';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(composant.utilisateursFiltres().length).toBe(1);
    });
  });

  // ── Modification des permissions ────────────────────────────────────────────────
  describe('modification des permissions (brouillon + enregistrement)', () => {
    it('basculerPermissionAdministration ajoute/retire la clé du brouillon et modieAdministration() détecte le changement', () => {
      const composant = construire();
      expect(composant.modifieAdministration()).toBe(false);
      composant.basculerPermissionAdministration('employees.create' as any);
      expect(composant.estCocheAdministration('employees.create' as any)).toBe(true);
      expect(composant.modifieAdministration()).toBe(true);
    });

    it('annulerAdministration restaure le brouillon aux permissions enregistrées', () => {
      const composant = construire();
      composant.basculerPermissionAdministration('employees.create' as any);
      composant.annulerAdministration();
      expect(composant.modifieAdministration()).toBe(false);
      expect(composant.estCocheAdministration('employees.create' as any)).toBe(false);
    });

    it('enregistrerAdministration appelle AdministrationUsersService.setPermissions avec le bon id et le bon brouillon', () => {
      const composant = construire();
      administrationUsersSpy.setPermissions.and.returnValue(of(utilisateurAdministration));
      composant.basculerPermissionAdministration('employees.create' as any);
      composant.enregistrerAdministration();
      expect(administrationUsersSpy.setPermissions).toHaveBeenCalledWith(
        'u1',
        jasmine.arrayContaining(['employees.view', 'employees.create']),
      );
      expect(notificationSpy.showSuccess).toHaveBeenCalled();
    });

    it("peutModifierAdministration() est false sur l'utilisateur appelant lui-même (anti auto-escalade)", () => {
      const composant = construire({ currentUser: { _id: 'u1', role: 'manager', administrationPermissions: ['roles.manage'] } });
      expect(composant.peutModifierAdministration()).toBe(false);
    });

    it('peutModifierAdministration() est false sur une cible super_admin', () => {
      const adminSuperAdmin: UtilisateurAdministration = { ...utilisateurAdministration, role: 'super_admin' };
      administrationUsersSpy = jasmine.createSpyObj('AdministrationUsersService', ['getUtilisateurs', 'setPermissions']);
      administrationUsersSpy.getUtilisateurs.and.returnValue(of([adminSuperAdmin]));
      sessionSpy = jasmine.createSpyObj<SessionService>('SessionService', ['getUtilisateurs', 'toggleDroitsFinance', 'setFinancialRole', 'setPermissions']);
      sessionSpy.getUtilisateurs.and.returnValue(of([utilisateurFinance]));
      notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);
      authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
      authServiceSpy.getCurrentUser.and.returnValue({ _id: 'moi', role: 'manager', administrationPermissions: ['roles.manage'] } as any);

      TestBed.configureTestingModule({
        providers: [
          { provide: SESSION_SERVICE, useValue: sessionSpy },
          { provide: AdministrationUsersService, useValue: administrationUsersSpy },
          { provide: NotificationService, useValue: notificationSpy },
          { provide: AuthService, useValue: authServiceSpy },
        ],
      });
      const composant = TestBed.runInInjectionContext(() => new RolesAccess());
      expect(composant.peutModifierAdministration()).toBe(false);
    });

    it("peutModifierAdministration() est false si l'appelant n'a pas roles.manage", () => {
      const composant = construire({ currentUser: { _id: 'moi', role: 'manager', administrationPermissions: [] } });
      expect(composant.peutModifierAdministration()).toBe(false);
    });
  });

  // ── Fonctionnement des permissions financières (section déplacée) ──────────────
  describe('fonctionnement des permissions financières (comportement inchangé après le déplacement)', () => {
    it('basculerDroitsFinance appelle session.toggleDroitsFinance avec le bon id', () => {
      const composant = construire();
      sessionSpy.toggleDroitsFinance.and.returnValue(of({ ...utilisateurFinance, droitsFinance: false }));
      composant.basculerDroitsFinance(composant.utilisateurSelectionne()!);
      expect(sessionSpy.toggleDroitsFinance).toHaveBeenCalledWith('u1');
      expect(notificationSpy.showSuccess).toHaveBeenCalled();
    });

    it('changerRoleFinance appelle session.setFinancialRole avec le bon id et le bon rôle', () => {
      const composant = construire();
      sessionSpy.setFinancialRole.and.returnValue(of(utilisateurFinance));
      composant.changerRoleFinance(composant.utilisateurSelectionne()!, Role.ADMINISTRATEUR);
      expect(sessionSpy.setFinancialRole).toHaveBeenCalledWith('u1', Role.ADMINISTRATEUR);
    });

    it('basculerPermissionFinance ne modifie rien si droitsFinance est désactivé pour cet utilisateur', () => {
      const utilisateurSansDroits: Utilisateur = { ...utilisateurFinance, droitsFinance: false, permissions: [] };
      sessionSpy = jasmine.createSpyObj<SessionService>('SessionService', ['getUtilisateurs', 'toggleDroitsFinance', 'setFinancialRole', 'setPermissions']);
      sessionSpy.getUtilisateurs.and.returnValue(of([utilisateurSansDroits]));
      administrationUsersSpy = jasmine.createSpyObj('AdministrationUsersService', ['getUtilisateurs', 'setPermissions']);
      administrationUsersSpy.getUtilisateurs.and.returnValue(of([utilisateurAdministration]));
      notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);
      authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
      authServiceSpy.getCurrentUser.and.returnValue({ _id: 'moi', role: 'manager', administrationPermissions: ['roles.manage'] } as any);
      TestBed.configureTestingModule({
        providers: [
          { provide: SESSION_SERVICE, useValue: sessionSpy },
          { provide: AdministrationUsersService, useValue: administrationUsersSpy },
          { provide: NotificationService, useValue: notificationSpy },
          { provide: AuthService, useValue: authServiceSpy },
        ],
      });
      const composant = TestBed.runInInjectionContext(() => new RolesAccess());
      composant.basculerPermissionFinance('transactions.view' as any);
      expect(composant.estCocheFinance('transactions.view' as any)).toBe(false);
    });

    it('enregistrerFinance appelle session.setPermissions avec le bon id et le brouillon courant', () => {
      const composant = construire();
      sessionSpy.setPermissions.and.returnValue(of(utilisateurFinance));
      composant.enregistrerFinance();
      expect(sessionSpy.setPermissions).toHaveBeenCalledWith('u1', jasmine.arrayContaining(['transactions.view']));
      expect(notificationSpy.showSuccess).toHaveBeenCalled();
    });
  });

  // ── Blocage du changement de sélection si une modification est en cours ────────
  describe('protection contre la perte de modifications non enregistrées', () => {
    it("selectionner() n'a aucun effet si une modification Administration est en attente", () => {
      const composant = construire();
      composant.basculerPermissionAdministration('employees.create' as any);
      const idAvant = composant.utilisateurSelectionne()?.idUtilisateur;
      composant.selectionner({
        idUtilisateur: 'u2',
        identifiants: 'bob@agence.com',
        roleOperationnel: 'collector',
        finance: null,
        administration: null,
      });
      expect(composant.utilisateurSelectionne()?.idUtilisateur).toBe(idAvant);
    });
  });
});
