/**
 * Índice de traducciones ES → EN.
 * Cada dominio vive en su propio archivo para evitar conflictos al trabajar en paralelo.
 * La clave es SIEMPRE el string en español (con `{var}` para partes dinámicas).
 */
import { enCommon } from './common';
import { enErrors } from './errors';
import { enLayout } from './layout';
import { enProfile } from './profile';
import { enOnboarding } from './onboarding';
import { enTraining } from './training';
import { enTraining2 } from './training2';
import { enNeurofit } from './neurofit';
import { enAwards } from './awards';
import { enCommunity } from './community';
import { journalTranslations } from './journal';

export const EN: Record<string, string> = {
  ...enCommon,
  ...enErrors,
  ...enLayout,
  ...enProfile,
  ...enOnboarding,
  ...enTraining,
  ...enTraining2,
  ...enNeurofit,
  ...enAwards,
  ...enCommunity,
  ...journalTranslations.es,
};
