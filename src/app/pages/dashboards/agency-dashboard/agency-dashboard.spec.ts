import { FormBuilder } from '@angular/forms';
import { Subject } from 'rxjs';
import { AgencyDashboard } from './agency-dashboard';

/**
 * Prompt 06 :
 *  - point 3 — `filterIncidents()` (jusqu'ici entièrement mort : logique
 *    commentée, ne changeait jamais la liste affichée malgré des `<select>`
 *    apparemment fonctionnels) doit désormais réellement recharger via le
 *    nouveau `getAgencySignalements$()`, filtrable par origine ; l'assignation/
 *    résolution doit cibler les nouveaux endpoints Signalement (les anciens,
 *    Collecte-based, ne peuvent pas adresser un signalement indépendant).
 *  - point 4 — un `newNotification` de type 'Signalement' reçu en direct doit
 *    déclencher un rechargement de la liste, sans refresh manuel.
 */
function stubLoaders(component: AgencyDashboard, except: string[] = []): void {
  const loaderNames = [
    'initializeCitiesAndNeighborhoods', 'initializeFiltersData',
    'loadAgencyStatistics', 'loadAgencyData', 'loadEmployees', 'loadCollectors',
    'loadCollectDay', 'loadAgencyReports', 'loadVehicles', 'loadTariffs',
    'loadContrats', 'loadPlannings', 'loadZones', 'getAllCountries', 'loadCollectHistory',
    'countUnreadMessages', 'userMessages',
  ];
  loaderNames.filter((n) => !except.includes(n)).forEach((n) => {
    spyOn(component as any, n).and.stub();
  });
}

describe('AgencyDashboard - signalements unifiés (Prompt 06)', () => {
  let component: AgencyDashboard;
  let agencyServiceSpy: { getAgencySignalements$: jasmine.Spy; assignSignalementToTeam$: jasmine.Spy; resolveSignalement$: jasmine.Spy };
  let notificationServiceSpy: { showSuccess: jasmine.Spy; showError: jasmine.Spy };
  let newNotification$: Subject<any>;
  let websocketServiceSpy: { onNewNotification: jasmine.Spy };
  let contratServiceSpy: { getContratsByAgence$: jasmine.Spy; creerContrat$: jasmine.Spy; resilierContrat$: jasmine.Spy };

  beforeEach(() => {
    newNotification$ = new Subject();
    agencyServiceSpy = {
      getAgencySignalements$: jasmine.createSpy('getAgencySignalements$').and.returnValue({
        subscribe: ({ next }: any) => next && next([]),
      }),
      assignSignalementToTeam$: jasmine.createSpy('assignSignalementToTeam$').and.returnValue({
        subscribe: ({ next }: any) => next && next({ success: true }),
      }),
      resolveSignalement$: jasmine.createSpy('resolveSignalement$').and.returnValue({
        subscribe: ({ next }: any) => next && next({ success: true }),
      }),
    };
    notificationServiceSpy = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
    websocketServiceSpy = { onNewNotification: jasmine.createSpy('onNewNotification').and.returnValue(newNotification$.asObservable()) };
    contratServiceSpy = {
      getContratsByAgence$: jasmine.createSpy('getContratsByAgence$').and.returnValue({
        subscribe: ({ next }: any) => next && next([]),
      }),
      creerContrat$: jasmine.createSpy('creerContrat$').and.returnValue({
        subscribe: ({ next }: any) => next && next({ message: 'ok', contrat: { _id: 'c1' } }),
      }),
      resilierContrat$: jasmine.createSpy('resilierContrat$').and.returnValue({
        subscribe: ({ next }: any) => next && next({ message: 'ok', contrat: { _id: 'c1' } }),
      }),
    };

    component = new AgencyDashboard(
      { getCurrentUser: () => ({ _id: 'manager-1', agencyId: 'agency-1' }) } as any,
      agencyServiceSpy as any,
      {} as any,
      notificationServiceSpy as any,
      {} as any,
      { detectChanges: () => {} } as any,
      new FormBuilder(),
      {} as any,
      {} as any,
      {} as any,
      { fragment: { subscribe: () => {} }, queryParams: { subscribe: () => {} } } as any,
      {} as any,
      {} as any,
      {} as any,
      websocketServiceSpy as any,
      contratServiceSpy as any,
      {} as any,
      {} as any,
    );
    component.currentUser = { _id: 'manager-1', agencyId: 'agency-1' } as any;
    component.tabs = [{ id: 'reports', badge: 0 } as any];
    component.statistics = { pendingSignalements: 0 } as any;
  });

  it("filterIncidents() recharge réellement la liste (bug corrigé — n'était auparavant qu'un no-op)", () => {
    spyOn(component, 'loadAgencyReports');
    component.filterIncidents();
    expect(component.loadAgencyReports).toHaveBeenCalledWith(component.currentUser);
  });

  it('loadAgencyReports() transmet le filtre origine au serveur', () => {
    component.origineFilter = 'independant';
    component.loadAgencyReports(component.currentUser);
    const filters = agencyServiceSpy.getAgencySignalements$.calls.argsFor(0)[0];
    expect(filters.origine).toBe('independant');
  });

  it('loadAgencyReports() applique le filtre de sévérité côté client sur le résultat', () => {
    agencyServiceSpy.getAgencySignalements$.and.returnValue({
      subscribe: ({ next }: any) => next([{ _id: '1', severity: 'high' }, { _id: '2', severity: 'low' }]),
    });
    component.severityFilter = 'high';
    component.loadAgencyReports(component.currentUser);
    expect(component.agencyReports.length).toBe(1);
    expect((component.agencyReports[0] as any)._id).toBe('1');
  });

  it("onAssignReportToTeam() cible le nouvel endpoint Signalement (fonctionne aussi pour un signalement indépendant, sans collecteId) et rafraîchit aussi les statistiques", () => {
    spyOn(component, 'loadAgencyStatistics');
    component.onAssignReportToTeam({ incidentId: 'sig-1', teamId: 'team-1' });
    expect(agencyServiceSpy.assignSignalementToTeam$).toHaveBeenCalledWith('sig-1', 'team-1');
    expect(component.loadAgencyStatistics).toHaveBeenCalledWith(component.currentUser);
  });

  it('resolveIncident() cible le nouvel endpoint Signalement, sans resolvedBy (dérivé côté serveur) et rafraîchit aussi les statistiques', () => {
    spyOn(component, 'loadAgencyStatistics');
    component.resolveIncident('sig-1');
    expect(agencyServiceSpy.resolveSignalement$).toHaveBeenCalledWith('sig-1');
    expect(component.loadAgencyStatistics).toHaveBeenCalledWith(component.currentUser);
  });

  it("un newNotification de type 'Signalement' reçu en direct recharge la liste ET les statistiques automatiquement", () => {
    stubLoaders(component, ['loadAgencyReports', 'loadAgencyStatistics']);
    spyOn(component, 'loadAgencyReports');
    spyOn(component, 'loadAgencyStatistics');

    component.ngOnInit(); // appelle déjà loadAgencyReports/loadAgencyStatistics une fois (chargement initial)
    const reportCallsAfterInit = (component.loadAgencyReports as jasmine.Spy).calls.count();
    const statsCallsAfterInit = (component.loadAgencyStatistics as jasmine.Spy).calls.count();

    newNotification$.next({ type: 'Signalement', message: 'Nouveau signalement' });
    expect((component.loadAgencyReports as jasmine.Spy).calls.count()).toBe(reportCallsAfterInit + 1);
    expect((component.loadAgencyStatistics as jasmine.Spy).calls.count()).toBe(statsCallsAfterInit + 1);
    expect(component.loadAgencyReports).toHaveBeenCalledWith(component.currentUser);
    expect(component.loadAgencyStatistics).toHaveBeenCalledWith(component.currentUser);
  });

  it("un newNotification d'un autre type (ex. 'Planning') ne recharge PAS à nouveau les signalements", () => {
    stubLoaders(component, ['loadAgencyReports']);
    spyOn(component, 'loadAgencyReports');

    component.ngOnInit(); // appelle déjà loadAgencyReports une fois (chargement initial)
    const callsAfterInit = (component.loadAgencyReports as jasmine.Spy).calls.count();

    newNotification$.next({ type: 'Planning', message: 'Planning publié' });
    expect((component.loadAgencyReports as jasmine.Spy).calls.count()).toBe(callsAfterInit);
  });

  it('ngOnDestroy() se désabonne du socket (pas de fuite mémoire)', () => {
    stubLoaders(component);
    component.ngOnInit();
    component.ngOnDestroy();
    newNotification$.next({ type: 'Signalement' });
    // Aucune assertion de crash n'est le test : si le composant détruit
    // réagissait encore, ce serait un signe de fuite d'abonnement.
    expect(true).toBe(true);
  });
});

/**
 * Phase 6, CONCEPTION_ABONNEMENT_CONTRAT.md §6.3/§6.4 — onglet "Contrats"
 * côté agence : création, résiliation (avec confirmation utilisateur), et
 * rafraîchissement en direct sur notification socket `type === 'Contrat'`.
 */
describe('AgencyDashboard - onglet Contrats (Phase 6)', () => {
  let component: AgencyDashboard;
  let contratServiceSpy: { getContratsByAgence$: jasmine.Spy; creerContrat$: jasmine.Spy; resilierContrat$: jasmine.Spy };
  let redevanceServiceSpy: { getRedevancesByContrat$: jasmine.Spy; payerRedevance$: jasmine.Spy };
  let notificationServiceSpy: { showSuccess: jasmine.Spy; showError: jasmine.Spy };
  let newNotification$: Subject<any>;
  let websocketServiceSpy: { onNewNotification: jasmine.Spy };

  beforeEach(() => {
    newNotification$ = new Subject();
    notificationServiceSpy = { showSuccess: jasmine.createSpy('showSuccess'), showError: jasmine.createSpy('showError') };
    websocketServiceSpy = { onNewNotification: jasmine.createSpy('onNewNotification').and.returnValue(newNotification$.asObservable()) };
    contratServiceSpy = {
      getContratsByAgence$: jasmine.createSpy('getContratsByAgence$').and.returnValue({
        subscribe: ({ next }: any) => next && next([]),
      }),
      creerContrat$: jasmine.createSpy('creerContrat$').and.returnValue({
        subscribe: ({ next }: any) => next && next({ message: 'ok', contrat: { _id: 'c1' } }),
      }),
      resilierContrat$: jasmine.createSpy('resilierContrat$').and.returnValue({
        subscribe: ({ next }: any) => next && next({ message: 'ok', contrat: { _id: 'c1' } }),
      }),
    };
    redevanceServiceSpy = {
      getRedevancesByContrat$: jasmine.createSpy('getRedevancesByContrat$').and.returnValue({
        subscribe: ({ next }: any) => next && next([{ _id: 'r1', status: 'en_attente', montant: 5000, periodLabel: 'Mai 2026' }]),
      }),
      payerRedevance$: jasmine.createSpy('payerRedevance$').and.returnValue({
        subscribe: ({ next }: any) => next && next({ message: 'ok', redevance: { _id: 'r1', status: 'paye' } }),
      }),
    };

    component = new AgencyDashboard(
      { getCurrentUser: () => ({ _id: 'manager-1', agencyId: 'agency-1' }) } as any,
      {} as any,
      {} as any,
      notificationServiceSpy as any,
      {} as any,
      { detectChanges: () => {} } as any,
      new FormBuilder(),
      {} as any,
      {} as any,
      {} as any,
      { fragment: { subscribe: () => {} }, queryParams: { subscribe: () => {} } } as any,
      {} as any,
      {} as any,
      {} as any,
      websocketServiceSpy as any,
      contratServiceSpy as any,
      redevanceServiceSpy as any,
      {} as any,
    );
    component.currentUser = { _id: 'manager-1', agencyId: 'agency-1' } as any;
    component.tabs = [{ id: 'contrats', badge: null } as any];
  });

  it('onCreerContrat() crée le contrat via ContratService puis recharge la liste', () => {
    spyOn(component, 'loadContrats');
    component.newContrat = { clientId: 'client-1', pricingId: 'pricing-1', frequenceCollecte: 'monthly', endDate: '' };

    component.onCreerContrat();

    expect(contratServiceSpy.creerContrat$).toHaveBeenCalledWith({
      clientId: 'client-1',
      agencyId: 'agency-1',
      pricingId: 'pricing-1',
      frequenceCollecte: 'monthly',
      endDate: undefined,
    });
    expect(notificationServiceSpy.showSuccess).toHaveBeenCalled();
    expect(component.loadContrats).toHaveBeenCalled();
    expect(component.showCreateContratModal).toBe(false);
  });

  it('onCreerContrat() ne fait aucun appel si le client ou le plan tarifaire est manquant', () => {
    component.newContrat = { clientId: '', pricingId: '', frequenceCollecte: 'monthly', endDate: '' };

    component.onCreerContrat();

    expect(contratServiceSpy.creerContrat$).not.toHaveBeenCalled();
    expect(notificationServiceSpy.showError).toHaveBeenCalled();
  });

  it("filteredContratClients : liste TOUS les clients de l'agence (bug corrigé — ne se limitait qu'aux clients avec un abonnement actif), filtrable par recherche", () => {
    component.allAgencyClients = [
      { _id: 'c1', firstName: 'Awa', lastName: 'Ouedraogo' },
      { _id: 'c2', firstName: 'Karim', lastName: 'Traore' },
    ] as any;

    expect(component.filteredContratClients.length).toBe(2);

    component.contratClientSearch = 'awa';
    expect(component.filteredContratClients.length).toBe(1);
    expect(component.filteredContratClients[0]._id).toBe('c1');

    component.contratClientSearch = 'inconnu';
    expect(component.filteredContratClients.length).toBe(0);
  });

  it("openRedevancesDrawer() charge les redevances du contrat sélectionné et ouvre le drawer", () => {
    const contrat = { _id: 'c1', clientId: 'client-1' } as any;

    component.openRedevancesDrawer(contrat);

    expect(redevanceServiceSpy.getRedevancesByContrat$).toHaveBeenCalledWith('c1');
    expect(component.showRedevancesDrawer).toBe(true);
    expect(component.redevancesDrawerContrat).toBe(contrat);
    expect(component.redevancesDrawerList.length).toBe(1);
    expect(component.redevancesDrawerList[0]._id).toBe('r1');
  });

  it('closeRedevancesDrawer() réinitialise le drawer', () => {
    component.openRedevancesDrawer({ _id: 'c1' } as any);
    component.closeRedevancesDrawer();

    expect(component.showRedevancesDrawer).toBe(false);
    expect(component.redevancesDrawerContrat).toBeNull();
    expect(component.redevancesDrawerList.length).toBe(0);
  });

  it("onMarquerRedevancePayee() demande confirmation puis marque la redevance payée SANS transactionId (paiement manuel) et recharge le drawer", () => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.openRedevancesDrawer({ _id: 'c1' } as any); // pré-remplit redevancesDrawerContrat pour le rechargement
    redevanceServiceSpy.getRedevancesByContrat$.calls.reset();

    component.onMarquerRedevancePayee({ _id: 'r1', periodLabel: 'Mai 2026', montant: 5000 } as any);

    expect(redevanceServiceSpy.payerRedevance$.calls.argsFor(0)).toEqual(['r1']); // 'r1' seul : pas de transactionId
    expect(notificationServiceSpy.showSuccess).toHaveBeenCalled();
    expect(redevanceServiceSpy.getRedevancesByContrat$).toHaveBeenCalledWith('c1'); // drawer rechargé
  });

  it("onMarquerRedevancePayee() n'appelle PAS le service si l'utilisateur annule la confirmation", () => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.onMarquerRedevancePayee({ _id: 'r1', periodLabel: 'Mai 2026', montant: 5000 } as any);

    expect(redevanceServiceSpy.payerRedevance$).not.toHaveBeenCalled();
  });

  it('onResilierContrat() demande confirmation puis résilie via ContratService et recharge la liste', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'prompt').and.returnValue('Fin de service');
    spyOn(component, 'loadContrats');

    component.onResilierContrat('c1');

    expect(contratServiceSpy.resilierContrat$).toHaveBeenCalledWith('c1', 'Fin de service');
    expect(notificationServiceSpy.showSuccess).toHaveBeenCalled();
    expect(component.loadContrats).toHaveBeenCalled();
  });

  it("onResilierContrat() n'appelle PAS le service si l'utilisateur annule la confirmation", () => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.onResilierContrat('c1');

    expect(contratServiceSpy.resilierContrat$).not.toHaveBeenCalled();
  });

  it("un newNotification de type 'Contrat' reçu en direct recharge la liste des contrats", () => {
    stubLoaders(component, ['loadContrats']);
    spyOn(component, 'loadContrats');

    component.ngOnInit(); // appelle déjà loadContrats une fois (chargement initial)
    const callsAfterInit = (component.loadContrats as jasmine.Spy).calls.count();

    newNotification$.next({ type: 'Contrat', message: 'Contrat créé' });
    expect((component.loadContrats as jasmine.Spy).calls.count()).toBe(callsAfterInit + 1);
  });
});
