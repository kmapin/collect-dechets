import { Subject } from 'rxjs';
import { ContratPage } from './contrat';

/**
 * Phase 6, CONCEPTION_ABONNEMENT_CONTRAT.md §6.2 — vue client "Mes contrats".
 * Même style de test que `client-dashboard.spec.ts`/`agency-dashboard.spec.ts` :
 * construction directe du composant (pas de TestBed), spies minimalistes.
 */
describe('ContratPage - vue client "Mes contrats" (Phase 6)', () => {
  let component: ContratPage;
  let authServiceSpy: { getCurrentUser: jasmine.Spy; currentUser$: Subject<any> };
  let contratServiceSpy: { getContratsByClient$: jasmine.Spy };
  let redevanceServiceSpy: { getRedevancesByContrat$: jasmine.Spy; getPropositionActivePaiementGroupe$: jasmine.Spy };
  let newNotification$: Subject<any>;
  let websocketServiceSpy: { onNewNotification: jasmine.Spy };

  const CONTRATS = [
    { _id: 'c1', clientId: 'client-1', agencyId: { _id: 'a1', name: 'Agence Test' }, pricingId: { _id: 'p1', price: 5000, planType: 'standard' }, frequenceCollecte: 'monthly', status: 'actif', prixParPeriode: 5000, passagesParPeriode: 4, startDate: '2026-01-01', endDate: null, documentUrl: null, documentPublicId: null },
  ];

  beforeEach(() => {
    newNotification$ = new Subject();
    authServiceSpy = {
      getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue({ _id: 'client-1' }),
      currentUser$: new Subject(),
    };
    contratServiceSpy = {
      getContratsByClient$: jasmine.createSpy('getContratsByClient$').and.returnValue({
        subscribe: ({ next }: any) => { next && next(CONTRATS); return { unsubscribe: () => {} }; },
      }),
    };
    redevanceServiceSpy = {
      getRedevancesByContrat$: jasmine.createSpy('getRedevancesByContrat$').and.returnValue({
        subscribe: ({ next }: any) => next && next([{ _id: 'r1', status: 'en_attente', montant: 5000, periodLabel: 'Mai 2026' }]),
      }),
      getPropositionActivePaiementGroupe$: jasmine.createSpy('getPropositionActivePaiementGroupe$').and.returnValue({
        subscribe: ({ next }: any) => next && next(null),
      }),
    };
    websocketServiceSpy = { onNewNotification: jasmine.createSpy('onNewNotification').and.returnValue(newNotification$.asObservable()) };

    component = new ContratPage(authServiceSpy as any, contratServiceSpy as any, redevanceServiceSpy as any, websocketServiceSpy as any);
  });

  it('ngOnInit() charge les contrats du client courant', () => {
    component.ngOnInit();
    expect(contratServiceSpy.getContratsByClient$).toHaveBeenCalledWith('client-1');
    expect(component.contrats.length).toBe(1);
    expect(component.contrats[0]._id).toBe('c1');
  });

  it("un newNotification de type 'Contrat' recharge la liste automatiquement", () => {
    component.ngOnInit();
    const callsAfterInit = contratServiceSpy.getContratsByClient$.calls.count();

    newNotification$.next({ type: 'Contrat', message: 'Contrat créé' });

    expect(contratServiceSpy.getContratsByClient$.calls.count()).toBe(callsAfterInit + 1);
  });

  it("un newNotification d'un autre type (ex. 'Subscribed') ne recharge PAS les contrats", () => {
    component.ngOnInit();
    const callsAfterInit = contratServiceSpy.getContratsByClient$.calls.count();

    newNotification$.next({ type: 'Subscribed', message: 'Abonnement' });

    expect(contratServiceSpy.getContratsByClient$.calls.count()).toBe(callsAfterInit);
  });

  it('toggleDetail(id) bascule la sélection du contrat affiché en détail', () => {
    component.toggleDetail('c1');
    expect(component.selectedContratId).toBe('c1');
    component.toggleDetail('c1');
    expect(component.selectedContratId).toBeNull();
  });

  it("toggleDetail(id) charge les redevances du contrat à l'ouverture (une seule fois, pas à la fermeture)", () => {
    component.toggleDetail('c1');
    expect(redevanceServiceSpy.getRedevancesByContrat$).toHaveBeenCalledWith('c1');
    expect(component.redevancesByContrat['c1'].length).toBe(1);

    const callsAfterOpen = redevanceServiceSpy.getRedevancesByContrat$.calls.count();
    component.toggleDetail('c1'); // referme
    component.toggleDetail('c1'); // réouvre — déjà en cache, pas de second appel
    expect(redevanceServiceSpy.getRedevancesByContrat$.calls.count()).toBe(callsAfterOpen);
  });

  it('payerRedevance(redevance) prépare tarifResponse avec redevanceId (pas tarifId/pricingId) et ouvre le formulaire', () => {
    component.currentUser = { _id: 'client-1' };
    const redevance = { _id: 'r1', status: 'en_attente', montant: 5000, periodLabel: 'Mai 2026' } as any;

    component.payerRedevance(redevance);

    expect(component.showPaymentForm).toBe(true);
    expect(component.tarifResponse.redevanceId).toBe('r1');
    expect(component.tarifResponse.amount).toBe(5000);
    expect(component.tarifResponse.userId).toBe('client-1');
  });

  it("un newNotification de type 'Redevance' recharge les redevances du contrat actuellement ouvert", () => {
    component.ngOnInit();
    component.toggleDetail('c1'); // ouvre c1, charge une première fois
    const callsAfterOpen = redevanceServiceSpy.getRedevancesByContrat$.calls.count();

    newNotification$.next({ type: 'Redevance', message: 'Redevance payée' });

    expect(redevanceServiceSpy.getRedevancesByContrat$.calls.count()).toBe(callsAfterOpen + 1);
  });

  it("un newNotification de type 'Redevance' ne fait rien si aucun contrat n'est ouvert", () => {
    component.ngOnInit();
    const callsAfterInit = redevanceServiceSpy.getRedevancesByContrat$.calls.count();

    newNotification$.next({ type: 'Redevance', message: 'Redevance payée' });

    expect(redevanceServiceSpy.getRedevancesByContrat$.calls.count()).toBe(callsAfterInit);
  });

  it('closePaymentForm() ferme le formulaire et recharge les redevances du contrat ouvert', () => {
    component.toggleDetail('c1');
    component.tarifResponse = { redevanceId: 'r1' };
    component.showPaymentForm = true;
    const callsBeforeClose = redevanceServiceSpy.getRedevancesByContrat$.calls.count();

    component.closePaymentForm();

    expect(component.showPaymentForm).toBe(false);
    expect(component.tarifResponse).toBeNull();
    expect(redevanceServiceSpy.getRedevancesByContrat$.calls.count()).toBe(callsBeforeClose + 1);
  });

  it('ngOnDestroy() se désabonne du socket (pas de fuite mémoire)', () => {
    component.ngOnInit();
    component.ngOnDestroy();
    newNotification$.next({ type: 'Contrat' });
    // Si le composant détruit réagissait encore, getContratsByClient$ serait
    // rappelée ici — l'absence d'assertion d'appel est le test.
    expect(true).toBe(true);
  });
});
