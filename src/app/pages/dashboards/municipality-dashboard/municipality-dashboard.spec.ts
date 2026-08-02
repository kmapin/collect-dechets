import { MunicipalityDashboard, Incident } from './municipality-dashboard';

function buildIncident(overrides: Partial<Incident>): Incident {
  return {
    _id: 'incident-x',
    agencyName: 'Agence Test',
    type: 'missed_collection',
    comment: '',
    description: '',
    severity: 'Low',
    date: new Date(),
    status: 'open',
    ...overrides,
  };
}

describe('MunicipalityDashboard - filterIncidents', () => {
  let component: MunicipalityDashboard;

  beforeEach(() => {
    // Constructor deps aren't exercised by filterIncidents(), so lightweight
    // stand-ins are enough — no TestBed/HTTP wiring needed for this unit test.
    component = new MunicipalityDashboard(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );

    component.incidents = [
      buildIncident({ _id: '1', status: 'open', severity: 'Critical' }),
      buildIncident({ _id: '2', status: 'pending', severity: 'Medium' }),
      buildIncident({ _id: '3', status: 'resolved', severity: 'Low' }),
      buildIncident({ _id: '4', status: 'open', severity: 'High' }),
    ];
  });

  it('keeps every incident when both filters are "all" (this drives the visible incident count)', () => {
    component.incidentsFilter = 'all';
    component.severityFilter = 'all';
    component.filterIncidents();
    expect(component.filteredIncidents.length).toBe(4);
  });

  it('changing the status filter changes the rendered incident count', () => {
    component.incidentsFilter = 'open';
    component.severityFilter = 'all';
    component.filterIncidents();
    expect(component.filteredIncidents.length).toBe(2);
    expect(component.filteredIncidents.every((i) => i.status === 'open')).toBe(true);
  });

  it('changing the severity filter changes the rendered incident count (case must match Incident.severity)', () => {
    component.incidentsFilter = 'all';
    component.severityFilter = 'Critical';
    component.filterIncidents();
    expect(component.filteredIncidents.length).toBe(1);
    expect(component.filteredIncidents[0]._id).toBe('1');
  });

  it('combining both filters narrows the count further', () => {
    component.incidentsFilter = 'open';
    component.severityFilter = 'High';
    component.filterIncidents();
    expect(component.filteredIncidents.length).toBe(1);
    expect(component.filteredIncidents[0]._id).toBe('4');
  });

  it('returns an empty list when no incident matches the combination (empty-state case)', () => {
    component.incidentsFilter = 'resolved';
    component.severityFilter = 'Critical';
    component.filterIncidents();
    expect(component.filteredIncidents.length).toBe(0);
  });
});

describe('MunicipalityDashboard - getIncidentBreakdown', () => {
  let component: MunicipalityDashboard;

  beforeEach(() => {
    component = new MunicipalityDashboard(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
  });

  it('returns an empty breakdown when no incidents are loaded (no divide-by-zero)', () => {
    component.incidents = [];
    expect(component.getIncidentBreakdown()).toEqual([]);
  });

  it('groups incidents by category and computes the exact percentage of each', () => {
    // Test fixtures only — not shipped in the component.
    component.incidents = [
      buildIncident({ _id: '1', type: 'missed_collection' }),
      buildIncident({ _id: '2', type: 'missed_collection' }),
      buildIncident({ _id: '3', type: 'compliance_issue' }),
      buildIncident({ _id: '4', type: 'complaint' }),
    ];

    expect(component.getIncidentBreakdown()).toEqual([
      { type: 'Collecte manquée', count: 2, percentage: 50 },
      { type: 'Non-conformité', count: 1, percentage: 25 },
      { type: 'Réclamation', count: 1, percentage: 25 },
    ]);
  });

  it('merges legacy "problem" incidents into the same "Collecte manquée" bucket as "missed_collection"', () => {
    component.incidents = [
      buildIncident({ _id: '1', type: 'missed_collection' }),
      buildIncident({ _id: '2', type: 'problem' as any }),
    ];

    expect(component.getIncidentBreakdown()).toEqual([
      { type: 'Collecte manquée', count: 2, percentage: 100 },
    ]);
  });
});

describe('MunicipalityDashboard - loadPerformanceOverview', () => {
  it('delegates to MunicipalityMockDataService and populates performanceOverview', () => {
    const mockDataService = {
      getPerformanceOverview: () => ({ averageSatisfaction: 4.1, complianceRate: 88 }),
    };
    const component = new MunicipalityDashboard(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      mockDataService as any
    );

    component.loadPerformanceOverview();

    expect(component.performanceOverview).toEqual({ averageSatisfaction: 4.1, complianceRate: 88 });
    expect(component.isLoadingPerformanceOverview).toBe(false);
  });
});
