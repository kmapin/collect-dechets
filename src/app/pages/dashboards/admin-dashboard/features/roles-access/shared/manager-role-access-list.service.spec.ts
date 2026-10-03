import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ManagerRoleAccessListService } from './manager-role-access-list.service';
import { Admin } from '../../../../../../services/admin';
import { Role } from '../../../../financial-dashboard/models';

describe('ManagerRoleAccessListService (source de liste partagée finance + administration)', () => {
  let adminServiceSpy: jasmine.SpyObj<Admin>;
  let service: ManagerRoleAccessListService;

  function construire(bruts: any[]): void {
    adminServiceSpy = jasmine.createSpyObj('Admin', ['getAllUsers']);
    adminServiceSpy.getAllUsers.and.returnValue(of({ success: true, data: bruts, pagination: {} }));

    TestBed.configureTestingModule({
      providers: [{ provide: Admin, useValue: adminServiceSpy }],
    });
    service = TestBed.inject(ManagerRoleAccessListService);
  }

  it('appelle GET /api/users avec role=manager et une limite large', () => {
    construire([]);
    service.charger().subscribe();
    expect(adminServiceSpy.getAllUsers).toHaveBeenCalledWith({ role: 'manager', page: 1, limit: 1000 });
  });

  it('mappe financialRole backend (snake_case) vers le Role enum frontend', () => {
    construire([
      { _id: 'm1', firstName: 'Awa', lastName: 'Traoré', agencyId: 'a1', agency: { name: 'Agence A' }, financialRole: 'administrateur', droitsFinance: true, financePermissions: ['transactions.view'], administrationPermissions: [] },
    ]);
    service.charger().subscribe((liste) => {
      expect(liste[0].financialRole).toBe(Role.ADMINISTRATEUR);
    });
  });

  it('financialRole null -> reste null (pas de rôle financier attribué)', () => {
    construire([
      { _id: 'm1', firstName: 'Awa', lastName: 'Traoré', agencyId: 'a1', agency: { name: 'Agence A' }, financialRole: null, droitsFinance: false, financePermissions: [], administrationPermissions: [] },
    ]);
    service.charger().subscribe((liste) => {
      expect(liste[0].financialRole).toBeNull();
    });
  });

  it('trie la liste par identifiants (ordre alphabétique)', () => {
    construire([
      { _id: 'm1', firstName: 'Zongo', lastName: 'Issa', agencyId: 'a1', agency: { name: 'Agence A' } },
      { _id: 'm2', firstName: 'Awa', lastName: 'Traoré', agencyId: 'a2', agency: { name: 'Agence B' } },
    ]);
    service.charger().subscribe((liste) => {
      expect(liste.map((u) => u.idUtilisateur)).toEqual(['m2', 'm1']);
    });
  });

  it("agence manquante -> agenceNom affiche un tiret plutôt que de planter", () => {
    construire([{ _id: 'm1', firstName: 'Awa', lastName: 'Traoré', agencyId: 'a1' }]);
    service.charger().subscribe((liste) => {
      expect(liste[0].agenceNom).toBe('—');
    });
  });
});
