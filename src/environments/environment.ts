export const environment = {
  production: true,

  //URL en pre prod
  // apiUrl:'http://localhost:3000/api',
  // apiUrl: 'http://213.32.120.11:3000/api',
  apiUrl: 'https://api.zerodechets.sahelys.com/api',
  // apiUrl: 'http://62.210.173.100:4010/api',

  // Racine du serveur SANS le suffixe /api — pour le WebSocket (core/services/
  // webstockets.ts) et le ping de santé (pages/service-unavailable). Valeur
  // explicite plutôt que dérivée de apiUrl par manipulation de chaîne : un
  // `.replace('/api', '')` cassait silencieusement dès que le domaine
  // contenait lui-même "api" ailleurs que dans le suffixe (ex. le sous-domaine
  // api.zerodechets.sahelys.com), en retirant le MAUVAIS "/api".
  apiRoot: 'https://api.zerodechets.sahelys.com',
  walletUrl: 'https://waste-6k43.onrender.com/wallet',
};