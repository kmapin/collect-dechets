import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EmployeeAdministrationService } from './employee-administration.service';
import { environment } from '../../../../../../../environments/environment';

describe('EmployeeAdministrationService (contrat HTTP réel vs routes/employeesAdministrationRoute.js)', () => {
  let service: EmployeeAdministrationService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/agency/employees`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(EmployeeAdministrationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('list() -> GET /agency/employees avec page/limit par défaut', () => {
    service.list().subscribe();
    const req = httpMock.expectOne((r) => r.url === base && r.method === 'GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush({ success: true, data: [], total: 0, page: 1, limit: 10, totalPages: 1 });
  });

  it('list({term, role}) -> query params term/role transmis', () => {
    service.list({ term: 'Awa', role: 'manager' }).subscribe();
    const req = httpMock.expectOne((r) => r.url === base && r.method === 'GET');
    expect(req.request.params.get('term')).toBe('Awa');
    expect(req.request.params.get('role')).toBe('manager');
    req.flush({ success: true, data: [], total: 0, page: 1, limit: 10, totalPages: 1 });
  });

  it('getById(id) -> GET /agency/employees/:id', () => {
    service.getById('abc123').subscribe();
    const req = httpMock.expectOne(`${base}/abc123`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: { _id: 'abc123' } });
  });

  it('create(payload) -> POST /agency/employees, body transmis tel quel', () => {
    const payload = {
      firstName: 'Awa', lastName: 'T', phone: '70000000', password: 'xxxxxx',
      role: 'collector' as const, address: { city: 'Ouaga' },
    };
    service.create(payload).subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, data: { _id: 'x', ...payload }, message: 'ok' });
  });

  it('update(id, payload) -> PUT /agency/employees/:id', () => {
    service.update('abc123', { firstName: 'Nouveau' }).subscribe();
    const req = httpMock.expectOne(`${base}/abc123`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ firstName: 'Nouveau' });
    req.flush({ success: true, data: { _id: 'abc123' }, message: 'ok' });
  });

  it('remove(id) -> DELETE /agency/employees/:id', () => {
    service.remove('abc123').subscribe();
    const req = httpMock.expectOne(`${base}/abc123`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ success: true, message: 'ok' });
  });
});
