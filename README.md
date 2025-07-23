# Fonctionnalités non connectées à un webservice

## Client
- Prochaines collectes : `loadUpcomingCollections()` (simulé)
- Historique des collectes : `loadCollectionHistory()` (simulé)
- Historique des paiements : `loadPaymentHistory()` (simulé)
- Abonnement : `loadSubscription()` (simulé)
- Paiement en ligne : `processPayment()` (simulé)
- Signalement de problème : `submitReport()` (simulé)
- Modification d'adresse : `editAddress()` (simulé)
- Génération de factures : `downloadInvoices()` (simulé)
- Suivi de collecte : `trackCollection()` (simulé)
- Notation de collecte : `rateCollection()` (simulé)
- Changement de moyen de paiement : `changePaymentMethod()` (simulé)

## Agence
- Statistiques principales : `statistics` (simulé)
- Collectes : `loadCollections()` (simulé)
- Employés : `loadEmployees()` (API pour `getAgencyAllEmployees`, sinon simulé)
- Zones de service : `loadServiceZones()`, `saveZone()`, `editZone()`, `deleteZone()` (simulé)
- Plannings : `loadSchedules()`, `addSchedule()`, `editSchedule()`, `deleteSchedule()` (simulé)
- Clients : `loadClients()` (API pour `getClientsByAgency`, sinon simulé)
- Signalements : `loadReports()`, `assignReport()`, `resolveReport()` (simulé)
- Rapports/analytics : `updateAnalytics()`, `exportReport()` (simulé)
- Actions sur clients (`suspendClient`, `deleteClient`) : simulé
- Actions sur collectes (`trackCollection`, `contactClient`) : simulé
- Actions sur employés (`addEmployee`, `deleteEmployee`) : API pour `addEmployee`, sinon simulé

Seules les méthodes explicitement connectées à un webservice (API) sont :
- `ClientService` : `getClientsByAgency`, `validateClientSubscription`
- `AgencyService` : `getAgencyAllEmployees`, `getAllAgenciesFromApi`, `getAgencyByIdFromApi`, `getZones`, `saveZone` (API), `addEmployee` (API)

Tout le reste est simulé/local. 