import { aLaPermissionAdministration, ADMINISTRATION_PERMISSIONS, AdministrationPermission } from './administration-permission';

describe('aLaPermissionAdministration', () => {
  it('renvoie false si aucun utilisateur', () => {
    expect(aLaPermissionAdministration(null, 'employees.view')).toBe(false);
    expect(aLaPermissionAdministration(undefined, 'employees.view')).toBe(false);
  });

  it('renvoie true pour super_admin quelles que soient ses permissions stockées', () => {
    const user = { role: 'super_admin', administrationPermissions: [] };
    expect(aLaPermissionAdministration(user, 'roles.manage')).toBe(true);
  });

  it("renvoie false pour un manager sans la permission demandée (utilisateur sans permission)", () => {
    const user = { role: 'manager', administrationPermissions: [] };
    expect(aLaPermissionAdministration(user, 'employees.view')).toBe(false);
  });

  it('renvoie true pour un manager détenant la permission demandée (manager avec permissions)', () => {
    const user = { role: 'manager', administrationPermissions: ['employees.view'] };
    expect(aLaPermissionAdministration(user, 'employees.view')).toBe(true);
  });

  it("suffit de détenir UNE des clés demandées (sémantique OR)", () => {
    const user = { role: 'manager', administrationPermissions: ['employees.create'] };
    expect(aLaPermissionAdministration(user, 'employees.view', 'employees.create')).toBe(true);
  });

  it('le catalogue contient exactement les 6 clés attendues', () => {
    const attendu: AdministrationPermission[] = [
      'employees.create', 'employees.delete', 'employees.update', 'employees.view', 'roles.manage', 'roles.view',
    ];
    expect([...ADMINISTRATION_PERMISSIONS].sort()).toEqual(attendu.sort());
  });

  describe('préréglage implicite propriétaire d\'agence (miroir de requirePermission.js)', () => {
    it('un manager isOwnerAgency=true sans permissions configurées a implicitement employees.*', () => {
      const owner = { role: 'manager', isOwnerAgency: true, administrationPermissions: [] };
      expect(aLaPermissionAdministration(owner, 'employees.view')).toBe(true);
      expect(aLaPermissionAdministration(owner, 'employees.create')).toBe(true);
      expect(aLaPermissionAdministration(owner, 'employees.update')).toBe(true);
      expect(aLaPermissionAdministration(owner, 'employees.delete')).toBe(true);
    });

    it('le préréglage propriétaire ne couvre jamais roles.view/roles.manage', () => {
      const owner = { role: 'manager', isOwnerAgency: true, administrationPermissions: [] };
      expect(aLaPermissionAdministration(owner, 'roles.view')).toBe(false);
      expect(aLaPermissionAdministration(owner, 'roles.manage')).toBe(false);
    });

    it('un co-manager (isOwnerAgency: false) n\'a aucun préréglage implicite', () => {
      const coManager = { role: 'manager', isOwnerAgency: false, administrationPermissions: [] };
      expect(aLaPermissionAdministration(coManager, 'employees.view')).toBe(false);
    });

    it('dès qu\'une permission explicite existe (tableau non vide), le préréglage cesse de s\'appliquer', () => {
      const owner = { role: 'manager', isOwnerAgency: true, administrationPermissions: ['employees.view'] };
      expect(aLaPermissionAdministration(owner, 'employees.view')).toBe(true);
      expect(aLaPermissionAdministration(owner, 'employees.delete')).toBe(false);
    });
  });
});
