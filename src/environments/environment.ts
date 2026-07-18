export const environment = {
  production: true,

  //URL en pre prod
  // apiUrl:'http://localhost:3000/api',
  apiUrl:'http://213.32.120.11:3000/api',
  walletUrl:'https://waste-6k43.onrender.com/wallet',

  // Financial Dashboard (mock-data MVP) — voir ARCHITECTURE.md §3/§9.
  // Gate les providers DI mock vs HttpClient pour ce module uniquement ; reste à true
  // pour toute la durée du MVP (aucune requête HTTP n'est déclenchée par ce module).
  useMocks: true,
};