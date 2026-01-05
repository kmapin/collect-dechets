import { Component } from '@angular/core';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-help',
  imports: [RouterModule],
  templateUrl: './help.html',
  styleUrl: './help.css'
})
export class Help {
  helpCategories = [
    {
      icon: 'person',
      title: 'Compte utilisateur',
      description: 'Gestion de votre profil et paramètres',
      items: [
        'Créer un compte',
        'Modifier ses informations',
        'Réinitialiser son mot de passe',
        'Gérer ses notifications'
      ]
    },
    {
      icon: 'local_shipping',
      title: 'Collectes',
      description: 'Tout sur les collectes de déchets',
      items: [
        'Programmer une collecte',
        'Suivre ses collectes',
        'Signaler un problème',
        'Comprendre les horaires'
      ]
    },
    {
      icon: 'payment',
      title: 'Facturation',
      description: 'Paiements et abonnements',
      items: [
        'Modes de paiement',
        'Consulter ses factures',
        'Modifier son abonnement',
        'Résoudre un problème de paiement'
      ]
    }
  ];
}