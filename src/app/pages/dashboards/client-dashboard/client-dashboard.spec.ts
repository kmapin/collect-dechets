import { Subject } from 'rxjs';
import { ClientDashboard } from './client-dashboard';

describe('ClientDashboard - planning unifié V1/V2 & signalement (Prompt 05)', () => {
  let component: ClientDashboard;
  let clientServiceSpy: { createSignalement: jasmine.Spy; getClientPlanning: jasmine.Spy; getClientReports: jasmine.Spy };

  beforeEach(() => {
    clientServiceSpy = {
      createSignalement: jasmine.createSpy('createSignalement').and.returnValue({
        subscribe: ({ next }: any) => next && next({ success: true }),
      }),
      getClientPlanning: jasmine.createSpy('getClientPlanning'),
      getClientReports: jasmine.createSpy('getClientReports').and.returnValue({
        subscribe: ({ next }: any) => next && next([]),
      }),
    };

    component = new ClientDashboard(
      {} as any,
      {} as any,
      clientServiceSpy as any,
      { showSuccess: () => {}, showError: () => {}, showInfo: () => {} } as any,
      {} as any,
      {} as any,
      { onNewNotification: () => new Subject().asObservable() } as any,
      {} as any,
      { checkEligibility$: () => ({ subscribe: () => {} }) } as any,
      {} as any,
      { snapshot: { queryParamMap: { get: () => null } } } as any,
      { getRedevancesByClient$: () => ({ subscribe: () => {} }) } as any,
      {} as any,
      {} as any
    );
    component.currentUser = { _id: 'client-1', agencyId: 'agency-1' };
  });

  it('rend identiquement une collecte V1 (sans schemaVersion, code=ObjectId legacy-shaped) et une collecte V2', () => {
    const v1Shaped = { _id: 'c-v1', date: new Date(), status: 'Scheduled', code: { startTime: '08:00', endTime: '10:00' } };
    const v2Shaped = { _id: 'c-v2', date: new Date(), status: 'Scheduled', code: { startTime: '09:00', endTime: '11:00' }, schemaVersion: 'v2' };
    clientServiceSpy.getClientPlanning.and.returnValue({
      subscribe: ({ next }: any) => next([v1Shaped, v2Shaped]),
    });

    component.getWeeklySchedule();

    expect(component.weeklySchedule.length).toBe(2);
    expect(component.weeklySchedule).toEqual([v1Shaped, v2Shaped]);
  });

  it('reportIssue(id) préremplit collecteId (parcours "lié à une collecte")', () => {
    component.reportIssue('collecte-42');
    expect(component.reportData.collecteId).toBe('collecte-42');
    expect(component.showReportModal).toBe(true);
  });

  it('reportIndependentIssue() vide collecteId (parcours indépendant, point d\'entrée séparé)', () => {
    component.reportData.collecteId = 'collecte-42';
    component.reportIndependentIssue();
    expect(component.reportData.collecteId).toBe('');
    expect(component.showReportModal).toBe(true);
  });

  it('submitReport() envoie collecteId quand présent (parcours lié à une collecte)', () => {
    component.reportData = { type: 'missed_collection', description: 'raté', severity: 'high', clientId: '', agencyId: '', collecteId: 'collecte-42' };

    component.submitReport();

    expect(clientServiceSpy.createSignalement.calls.count()).toBe(1);
    const payload = clientServiceSpy.createSignalement.calls.argsFor(0)[0];
    expect(payload.collecteId).toBe('collecte-42');
  });

  it("submitReport() n'envoie PAS collecteId quand absent (parcours indépendant)", () => {
    component.reportData = { type: 'complaint', description: 'problème général', severity: 'medium', clientId: '', agencyId: '', collecteId: '' };

    component.submitReport();

    expect(clientServiceSpy.createSignalement.calls.count()).toBe(1);
    const payload = clientServiceSpy.createSignalement.calls.argsFor(0)[0];
    expect('collecteId' in payload).toBe(false);
  });

  it('submitReport() ne fait aucun appel si un champ requis manque', () => {
    component.reportData = { type: '', description: '', severity: '', clientId: '', agencyId: '', collecteId: '' };

    component.submitReport();

    expect(clientServiceSpy.createSignalement.calls.count()).toBe(0);
  });
});

describe('ClientDashboard - "Mon contrat" (carte dashboard + rafraîchissement socket)', () => {
  let component: ClientDashboard;
  let contratServiceSpy: { getContratsByClient$: jasmine.Spy };
  let newNotification$: Subject<any>;
  let websocketServiceSpy: { onNewNotification: jasmine.Spy };

  const CONTRAT_ACTIF = { _id: 'c1', status: 'actif', frequenceCollecte: 'monthly', prixParPeriode: 5000, agencyId: { _id: 'a1', name: 'Agence Test' } };

  beforeEach(() => {
    newNotification$ = new Subject();
    contratServiceSpy = {
      getContratsByClient$: jasmine.createSpy('getContratsByClient$').and.returnValue({
        subscribe: ({ next }: any) => { next && next([CONTRAT_ACTIF]); return { unsubscribe: () => {} }; },
      }),
    };
    websocketServiceSpy = { onNewNotification: jasmine.createSpy('onNewNotification').and.returnValue(newNotification$.asObservable()) };

    component = new ClientDashboard(
      { currentUser$: new Subject() } as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      websocketServiceSpy as any,
      contratServiceSpy as any,
      { checkEligibility$: () => ({ subscribe: () => {} }) } as any,
      { listForClient: () => ({ subscribe: () => {} }) } as any,
      { snapshot: { queryParamMap: { get: () => null } } } as any,
      { getRedevancesByClient$: () => ({ subscribe: () => {} }) } as any,
      {} as any,
      {} as any,
    );
    component.currentUser = { _id: 'client-1', agencyId: 'agency-1' };
  });

  it('loadActiveContrat() charge le contrat du client et retient celui au statut actif', () => {
    component.loadActiveContrat();

    expect(contratServiceSpy.getContratsByClient$).toHaveBeenCalledWith('client-1');
    expect(component.activeContrat?._id).toBe('c1');
  });

  it("un newNotification de type 'Contrat' recharge le contrat automatiquement", () => {
    spyOn(component, 'loadDashboardData');
    component.ngOnInit();
    const callsAfterInit = contratServiceSpy.getContratsByClient$.calls.count();

    newNotification$.next({ type: 'Contrat', message: 'Contrat créé' });

    expect(contratServiceSpy.getContratsByClient$.calls.count()).toBe(callsAfterInit + 1);
  });

  it('contratStatusLabel()/contratFrequenceLabel() traduisent les valeurs backend en libellés lisibles', () => {
    expect(component.contratStatusLabel('actif')).toBe('Actif');
    expect(component.contratStatusLabel('resilie')).toBe('Résilié');
    expect(component.contratFrequenceLabel('monthly')).toBe('Mensuelle');
  });
});
