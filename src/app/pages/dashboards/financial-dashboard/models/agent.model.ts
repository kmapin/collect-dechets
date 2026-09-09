export interface Agent {
  readonly idAgent: string;
  nom: string;
  prenom?: string;
  telephone?: string;
  moovEligible: boolean;
  orangeEligible: boolean;
}
