export const environment = {
  production: true,
  // apiUrl: 'https://api.solidar.sertia.kerub.fr/solidar/api'
  apiUrl:'https://waste-6k43.onrender.com/api',
  // apiUrl:'http://localhost:3000/api',

  // Financial Dashboard (mock-data MVP) — voir ARCHITECTURE.md §3/§9.
  useMocks: true,
  // Voir environment.ts pour la note complète sur cette bascule fine par domaine (Prompt F5).
  useMocksOverrides: {
    finance: false,
    agent: false,
    session: false,
  } as Partial<Record<'client' | 'facture' | 'finance' | 'agent' | 'session', boolean>>,
};