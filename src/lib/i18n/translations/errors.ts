/**
 * ES → EN · Error pages (error.tsx, not-found.tsx, global-error.tsx y
 * etiquetas compartidas).
 *
 * Grupo único de traducciones para los estados de error de la app.
 * global-error.tsx importa este módulo directamente (es datos puros, sin
 * store/useT) para derivar su copia EN a partir de los strings ES — así los
 * textos EN viven solo aquí y no se duplican.
 */
export const enErrors: Record<string, string> = {
  // ── Error boundaries ──
  'Algo salió mal': 'Something went wrong',
  'CHISPA encontró un error inesperado. No te preocupes — tu progreso está guardado localmente en tu dispositivo.': 'CHISPA hit an unexpected error. Don\'t worry — your progress is saved locally on your device.',
  'Intentar de nuevo': 'Try again',
  'Volver al inicio': 'Back to start',
  'Recargar la página': 'Reload page',
  'Si el error persiste, contacta a soporte con el código:': 'If the error persists, contact support with the code:',
  '¡Copiado!': 'Copied!',
  'Copiar código': 'Copy code',

  // ── 404 ──
  'Página no encontrada': 'Page not found',
  'La página que buscas no existe o fue movida.': 'The page you are looking for does not exist or has been moved.',
};
