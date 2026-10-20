import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Mêmes listes de préfixes Burkina Faso que le backend
 * (services/transaction.js::verifyOperatorMsisdn, seule source de vérité) — reproduites
 * ici uniquement pour avertir l'utilisateur immédiatement côté frontend ; le backend
 * reste la validation faisant foi (jamais contournable en désactivant JS).
 */
const PREFIXES_PAR_OPERATEUR: Record<string, string[]> = {
  MOOV_MONEY: ['01', '02', '03', '50', '51', '52', '53', '60', '61', '62', '63', '70', '71', '72', '73'],
  ORANGE_MONEY: ['04', '05', '06', '07', '44', '45', '46', '47', '54', '55', '56', '57', '64', '65', '66', '67', '74', '75', '76', '77'],
  TELECEL_MONEY: ['58', '59', '68', '69', '78', '79'],
};

const LABEL_OPERATEUR: Record<string, string> = {
  ORANGE_MONEY: 'Orange Money',
  MOOV_MONEY: 'Moov Money',
  TELECEL_MONEY: 'Telecel Money',
};

// Un seul préfixe représentatif par opérateur (le premier de chaque liste ci-dessus) —
// uniquement pour un placeholder cohérent, jamais utilisé pour la validation elle-même.
const PREFIXE_EXEMPLE: Record<string, string> = {
  ORANGE_MONEY: '07',
  MOOV_MONEY: '70',
  TELECEL_MONEY: '58',
};

/** Placeholder du champ numéro, cohérent avec l'opérateur sélectionné (ex: "07000000" pour
 * Orange Money) — à défaut d'opérateur choisi, retombe sur l'exemple Moov déjà affiché. */
export function exempleNumeroOperateur(operator: string | null | undefined): string {
  const prefixe = (operator && PREFIXE_EXEMPLE[operator]) || '70';
  return `${prefixe}000000`;
}

/** Retire espaces/tirets/+ et l'indicatif 226 — même normalisation que le backend. */
function normaliserMsisdnBurkina(msisdn: string): string {
  let n = (msisdn || '').replace(/[\s\-+]/g, '');
  if (n.startsWith('226')) n = n.slice(3);
  return n;
}

/** Null si cohérent ou non vérifiable (opérateur/numéro absent ou format déjà invalide
 * — le Validators.pattern existant gère ce cas), sinon le message à afficher. */
export function verifierOperateurMsisdn(operator: string | null | undefined, msisdn: string | null | undefined): string | null {
  const prefixes = operator ? PREFIXES_PAR_OPERATEUR[operator] : undefined;
  if (!prefixes) return null;
  const n = normaliserMsisdnBurkina(msisdn || '');
  if (n.length !== 8) return null;
  return prefixes.includes(n.slice(0, 2)) ? null : `Ce numéro ne correspond pas à ${LABEL_OPERATEUR[operator!]}.`;
}

/**
 * Validateur de groupe (FormGroup) : pose/retire une erreur `operatorMismatch` sur le
 * contrôle du numéro, pas sur le groupe lui-même — pour rester compatible avec l'affichage
 * d'erreur existant de chaque formulaire (`form.get('customerMsisdn')?.invalid`), sans
 * toucher au template ni à la mécanique de soumission.
 */
export function operateurMsisdnCrossValidator(champOperateur: string, champMsisdn: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const msisdnControl = group.get(champMsisdn);
    if (!msisdnControl) return null;

    const message = verifierOperateurMsisdn(group.get(champOperateur)?.value, msisdnControl.value);
    const { operatorMismatch: _ignore, ...autresErreurs } = msisdnControl.errors ?? {};

    if (message) {
      msisdnControl.setErrors({ ...autresErreurs, operatorMismatch: message });
    } else if (msisdnControl.errors?.['operatorMismatch']) {
      msisdnControl.setErrors(Object.keys(autresErreurs).length ? autresErreurs : null);
    }
    return null;
  };
}
