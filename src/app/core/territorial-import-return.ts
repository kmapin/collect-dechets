export const TERRITORIAL_IMPORT_RETURN_URL_KEY = 'territorial-import:return-url';

const TERRITORIAL_IMPORT_PREVIEW_URL = /^\/territorial\/import\/[^/?#]+\/preview$/;

export function rememberTerritorialImportReturnUrl(url: string): void {
  if (!TERRITORIAL_IMPORT_PREVIEW_URL.test(url)) return;

  try {
    sessionStorage.setItem(TERRITORIAL_IMPORT_RETURN_URL_KEY, url);
  } catch (error) {
    console.warn('Impossible de conserver le contexte de l’import territorial interrompu.', error);
  }
}

export function getTerritorialImportReturnUrl(): string | null {
  try {
    const url = sessionStorage.getItem(TERRITORIAL_IMPORT_RETURN_URL_KEY);
    if (!url) return null;
    if (TERRITORIAL_IMPORT_PREVIEW_URL.test(url)) return url;

    sessionStorage.removeItem(TERRITORIAL_IMPORT_RETURN_URL_KEY);
  } catch (error) {
    console.warn('Impossible de lire le contexte de l’import territorial interrompu.', error);
  }

  return null;
}

export function clearTerritorialImportReturnUrl(): void {
  try {
    sessionStorage.removeItem(TERRITORIAL_IMPORT_RETURN_URL_KEY);
  } catch (error) {
    console.warn('Impossible d’effacer le contexte de l’import territorial interrompu.', error);
  }
}
