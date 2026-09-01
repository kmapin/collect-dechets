import { jsPDF } from 'jspdf';
import { PaiementAgentActionable } from '../../models';
import { formatMontantXof } from '../../utils/money.util';
import { formatFrDateTime } from '../../../../../shared/format.util';

// Même bibliothèque (jsPDF) et même palette que services/pdfContrat.js (backend, seul
// autre PDF de l'app) et ExportClientService (export tabulaire, même module, déjà une
// dépendance du projet) — aucune nouvelle bibliothèque, aucun 2e système de génération.
const COULEUR_PRIMAIRE: [number, number, number] = [34, 139, 34];
const COULEUR_TEXTE: [number, number, number] = [40, 40, 40];
const COULEUR_GRIS: [number, number, number] = [120, 120, 120];
const COULEUR_LIGNE: [number, number, number] = [220, 220, 220];

const STATUT_LABEL: Record<PaiementAgentActionable['status'], string> = {
  EN_ATTENTE_VALIDATION: 'En attente de validation',
  INITIATED: 'En cours de traitement',
  COMPLETED: 'Payé',
  FAILED: 'Échoué',
  A_VERIFIER_MANUELLEMENT: 'À vérifier manuellement',
  REJETE: 'Rejeté',
};

function providerLabel(provider: PaiementAgentActionable['provider']): string {
  if (provider === 'ORANGE_MONEY') return 'Orange Money';
  if (provider === 'MOOV') return 'Moov Money';
  return 'Interne (hors plateforme)';
}

function motifPour(paiement: PaiementAgentActionable): string | null {
  return paiement.rejectionReason ?? paiement.failureReason ?? null;
}

/**
 * Reçu de paiement agent — un seul document jsPDF construit ici, réutilisé à
 * l'IDENTIQUE par "Voir le reçu" et "Télécharger le reçu" (voir agent-payment.
 * component.ts) : jamais deux systèmes de génération distincts pour l'affichage et
 * le téléchargement.
 *
 * Construit uniquement à partir de données déjà chargées (l'historique + la liste
 * d'agents du composant, `PaiementAgent.agentId` référence toujours un
 * `User.role==='collector'`, voir services/paiementAgent.js::payerAgent — "fonction"
 * n'est donc jamais devinée) : aucun aller-retour réseau supplémentaire, donc aucun
 * risque de blocage popup par le navigateur sur "Voir le reçu" (window.open doit
 * rester synchrone avec le clic).
 */
export function construireRecuPaiementAgent(paiement: PaiementAgentActionable, agentNom: string, agenceNom?: string): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // En-tête
  doc.setFillColor(...COULEUR_PRIMAIRE);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ZéroDéchet+', pageW / 2, 13, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Reçu de paiement agent', pageW / 2, 21, { align: 'center' });
  if (agenceNom) {
    doc.setFontSize(9);
    doc.text(agenceNom, pageW / 2, 28, { align: 'center' });
  }

  y = 46;

  // Statut + référence
  doc.setFillColor(...COULEUR_PRIMAIRE);
  doc.roundedRect(margin, y - 6, 56, 9, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(STATUT_LABEL[paiement.status].toUpperCase(), margin + 28, y - 0.5, { align: 'center' });

  doc.setTextColor(...COULEUR_GRIS);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Réf. ${paiement.reference ?? paiement.idPaiementAgent}`, pageW - margin, y - 0.5, { align: 'right' });

  y += 16;

  const ligne = (label: string, valeur: string) => {
    doc.setTextColor(...COULEUR_GRIS);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin, y);
    doc.setTextColor(...COULEUR_TEXTE);
    doc.setFont('helvetica', 'bold');
    doc.text(valeur, margin + 62, y);
    y += 7;
  };

  const section = (titre: string) => {
    doc.setTextColor(...COULEUR_PRIMAIRE);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(titre, margin, y);
    doc.setDrawColor(...COULEUR_LIGNE);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 2, pageW - margin, y + 2);
    y += 9;
  };

  section('AGENT');
  ligne('Nom :', agentNom || 'Agent introuvable');
  ligne('Fonction :', 'Agent collecteur');
  y += 4;

  section('PAIEMENT');
  ligne('Montant :', formatMontantXof(paiement.montant));
  ligne('Date du paiement :', formatFrDateTime(paiement.datePaiement));
  ligne('Mode de paiement :', providerLabel(paiement.provider));

  const motif = motifPour(paiement);
  if (motif) ligne('Motif :', motif);

  // Pied de page
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...COULEUR_PRIMAIRE);
  doc.rect(0, pageH - 16, pageW, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Document généré automatiquement — ZéroDéchet+', pageW / 2, pageH - 8, { align: 'center' });
  doc.text(`Paiement réf. ${paiement.reference ?? paiement.idPaiementAgent}`, pageW / 2, pageH - 3, { align: 'center' });

  return doc;
}

// `recu-paiement-<reference>-<agent>.pdf` — convention demandée, adaptée au projet
// (slug ASCII sans accents/espaces, comme les autres noms de fichiers générés par
// ExportClientService dans ce même module).
export function nomFichierRecuPaiementAgent(paiement: PaiementAgentActionable, agentNom: string): string {
  const slug = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/(^-|-$)/g, '').toLowerCase();
  const ref = slug(paiement.reference ?? paiement.idPaiementAgent);
  const agent = agentNom ? slug(agentNom) : 'agent';
  return `recu-paiement-${ref}-${agent}.pdf`;
}

// Même document que le téléchargement (voir construireRecuPaiementAgent) — seule la
// sortie diffère (aperçu navigateur vs fichier enregistré).
export function ouvrirRecuDansNouvelOnglet(doc: jsPDF): void {
  const url = doc.output('bloburl') as unknown as string;
  window.open(url, '_blank');
}

export function telechargerRecuPdf(doc: jsPDF, nomFichier: string): void {
  doc.save(nomFichier);
}
