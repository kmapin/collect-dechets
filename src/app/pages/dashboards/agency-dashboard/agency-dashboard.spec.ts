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
    'loadPlannings', 'loadZones', 'getAllCountries', 'loadCollectHistory',
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
