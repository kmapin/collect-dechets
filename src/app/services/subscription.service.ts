import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Subscription, SubscriptionStatus, BillingCycle, Payment, PaymentStatus, Invoice, InvoiceStatus } from '../models/subscription.model';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private subscriptions: Subscription[] = [
    {
      id: '1',
      clientId: 'client1',
      agencyId: 'agency1',
      serviceId: 'service1',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date('2024-01-01'),
      billingCycle: BillingCycle.MONTHLY,
      amount: 25.99,
      currency: 'EUR',
      paymentMethod: {
        id: 'pm1',
        type: 'card',
        isDefault: true,
        lastFour: '1234',
        expiryDate: '12/26'
      },
      lastPaymentDate: new Date('2024-01-01'),
      nextPaymentDate: new Date('2024-02-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ];

  private payments: Payment[] = [
    {
      id: '1',
      subscriptionId: '1',
      amount: 25.99,
      currency: 'EUR',
      status: PaymentStatus.COMPLETED,
      paymentMethod: {
        id: 'pm1',
        type: 'card',
        isDefault: true,
        lastFour: '1234'
      },
      transactionId: 'txn_123456',
      paidAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ];

  private invoices: Invoice[] = [
    {
      id: '1',
      subscriptionId: '1',
      invoiceNumber: 'INV-2024-001',
      amount: 25.99,
      currency: 'EUR',
      status: InvoiceStatus.PAID,
      dueDate: new Date('2024-01-01'),
      paidAt: new Date('2024-01-01'),
      items: [
        {
          id: '1',
          description: 'Collecte Standard - Janvier 2024',
          quantity: 1,
          unitPrice: 25.99,
          totalPrice: 25.99
        }
      ],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  ];

  getSubscriptions(): Observable<Subscription[]> {
    return of(this.subscriptions).pipe(delay(500));
  }

  getSubscriptionById(id: string): Observable<Subscription | undefined> {
    return of(this.subscriptions.find(sub => sub.id === id)).pipe(delay(300));
  }

  getSubscriptionsByClient(clientId: string): Observable<Subscription[]> {
    return of(this.subscriptions.filter(sub => sub.clientId === clientId)).pipe(delay(400));
  }

  createSubscription(subscription: Partial<Subscription>): Observable<Subscription> {
    const newSubscription: Subscription = {
      id: Math.random().toString(36).substr(2, 9),
      clientId: subscription.clientId || '',
      agencyId: subscription.agencyId || '',
      serviceId: subscription.serviceId || '',
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      billingCycle: subscription.billingCycle || BillingCycle.MONTHLY,
      amount: subscription.amount || 0,
      currency: subscription.currency || 'EUR',
      paymentMethod: subscription.paymentMethod || {
        id: 'default',
        type: 'card',
        isDefault: true
      },
      nextPaymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.subscriptions.push(newSubscription);
    return of(newSubscription).pipe(delay(1000));
  }

  updateSubscription(id: string, updates: Partial<Subscription>): Observable<Subscription> {
    const index = this.subscriptions.findIndex(sub => sub.id === id);
    if (index !== -1) {
      this.subscriptions[index] = { ...this.subscriptions[index], ...updates, updatedAt: new Date() };
      return of(this.subscriptions[index]).pipe(delay(800));
    }
    throw new Error('Subscription not found');
  }

  cancelSubscription(id: string): Observable<Subscription> {
    return this.updateSubscription(id, { 
      status: SubscriptionStatus.CANCELLED,
      endDate: new Date()
    });
  }

  suspendSubscription(id: string): Observable<Subscription> {
    return this.updateSubscription(id, { status: SubscriptionStatus.SUSPENDED });
  }

  reactivateSubscription(id: string): Observable<Subscription> {
    return this.updateSubscription(id, { status: SubscriptionStatus.ACTIVE });
  }

  getPayments(): Observable<Payment[]> {
    return of(this.payments).pipe(delay(500));
  }

  getPaymentsBySubscription(subscriptionId: string): Observable<Payment[]> {
    return of(this.payments.filter(payment => payment.subscriptionId === subscriptionId)).pipe(delay(400));
  }

  processPayment(subscriptionId: string, paymentMethod: any): Observable<Payment> {
    const subscription = this.subscriptions.find(sub => sub.id === subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const newPayment: Payment = {
      id: Math.random().toString(36).substr(2, 9),
      subscriptionId: subscriptionId,
      amount: subscription.amount,
      currency: subscription.currency,
      status: PaymentStatus.COMPLETED,
      paymentMethod: paymentMethod,
      transactionId: 'txn_' + Math.random().toString(36).substr(2, 9),
      paidAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.payments.push(newPayment);

    // Mettre à jour la date du prochain paiement
    const nextPaymentDate = new Date();
    switch (subscription.billingCycle) {
      case BillingCycle.MONTHLY:
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        break;
      case BillingCycle.QUARTERLY:
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
        break;
      case BillingCycle.YEARLY:
        nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
        break;
    }

    this.updateSubscription(subscriptionId, {
      lastPaymentDate: new Date(),
      nextPaymentDate: nextPaymentDate
    });

    return of(newPayment).pipe(delay(1000));
  }

  getInvoices(): Observable<Invoice[]> {
    return of(this.invoices).pipe(delay(500));
  }

  getInvoicesBySubscription(subscriptionId: string): Observable<Invoice[]> {
    return of(this.invoices.filter(invoice => invoice.subscriptionId === subscriptionId)).pipe(delay(400));
  }

  generateInvoice(subscriptionId: string): Observable<Invoice> {
    const subscription = this.subscriptions.find(sub => sub.id === subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const newInvoice: Invoice = {
      id: Math.random().toString(36).substr(2, 9),
      subscriptionId: subscriptionId,
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(this.invoices.length + 1).padStart(3, '0')}`,
      amount: subscription.amount,
      currency: subscription.currency,
      status: InvoiceStatus.SENT,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
      items: [
        {
          id: '1',
          description: `Service de collecte - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
          quantity: 1,
          unitPrice: subscription.amount,
          totalPrice: subscription.amount
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.invoices.push(newInvoice);
    return of(newInvoice).pipe(delay(1000));
  }

  markInvoiceAsPaid(invoiceId: string): Observable<Invoice> {
    const index = this.invoices.findIndex(inv => inv.id === invoiceId);
    if (index !== -1) {
      this.invoices[index] = {
        ...this.invoices[index],
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
        updatedAt: new Date()
      };
      return of(this.invoices[index]).pipe(delay(500));
    }
    throw new Error('Invoice not found');
  }
}