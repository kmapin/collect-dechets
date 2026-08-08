import { FormBuilder } from '@angular/forms';
import { MobileMoneyFormComponent } from './mobile-money-form';

/**
 * Phase 8 — `onSubmit()` doit transmettre `redevanceId` (présent dans
 * `tarifResponse` pour un paiement de redevance, absent pour un paiement
 * d'abonnement) au `PaymentService`, en plus des champs déjà existants.
 */
describe('MobileMoneyFormComponent - transmission de redevanceId (Phase 8)', () => {
  let component: MobileMoneyFormComponent;
  let paymentServiceSpy: { processPayment: jasmine.Spy; currentPaymentResponse: any };

  beforeEach(() => {
    paymentServiceSpy = {
      processPayment: jasmine.createSpy('processPayment').and.returnValue({ subscribe: () => {} }),
      currentPaymentResponse: null,
    };
    component = new MobileMoneyFormComponent(new FormBuilder(), paymentServiceSpy as any, {} as any);
  });

  function remplirFormulaireValide() {
    component.paymentForm.patchValue({
      operator: 'ORANGE_MONEY',
      phoneNumber: '70000000',
      amount: 5000,
      description: 'Paiement redevance',
    });
  }

  it('transmet redevanceId au PaymentService quand tarifResponse en contient un (paiement de redevance)', () => {
    component.tarifResponse = { redevanceId: 'r1', userId: 'client-1', amount: 5000 };
    remplirFormulaireValide();

    component.onSubmit();

    const request = paymentServiceSpy.processPayment.calls.argsFor(0)[0];
    expect(request.redevanceId).toBe('r1');
  });

  it("ne transmet PAS de redevanceId pour un paiement d'abonnement (tarifResponse sans redevanceId, comportement inchangé)", () => {
    component.tarifResponse = { tarifId: 'p1', agencyId: 'a1', userId: 'client-1', numberMonths: '1', amount: 5000 };
    remplirFormulaireValide();

    component.onSubmit();

    const request = paymentServiceSpy.processPayment.calls.argsFor(0)[0];
    expect(request.redevanceId).toBeUndefined();
    expect(request.pricingId).toBe('p1');
  });
});
