'use client';

import { ICONS, type FitnessIconName } from '@/lib/utils/fitness-icons';

export interface FitnessIconProps {
  /** ID del icono (ej: 'dumbbell', 'running', 'core') */
  name: FitnessIconName | string;
  /** Tamaño en píxeles (width & height). Default: 24 */
  size?: number;
  /** Color del stroke. Default: 'currentColor' (hereda de Tailwind: text-amber-500) */
  color?: string;
  /** Clases CSS adicionales para el elemento <svg> */
  className?: string;
  /** Título accesible (aria-label). Si se omite, el icono es decorativo */
  title?: string;
}

/**
 * FitnessIcon — renderiza cualquiera de los 24 iconos SVG fitness desde el pack HugeIcons.
 *
 * Los SVGs usan `stroke="currentColor"` internamente, por lo que el color se hereda
 * del padre. Para cambiar el color vía Tailwind:
 *
 *   <FitnessIcon name="dumbbell" className="text-amber-500" />
 *
 * O vía prop `color`:
 *
 *   <FitnessIcon name="running" color="#f5a623" size={32} />
 *
 * Si el `name` no existe en el registro, retorna `null` (no renderiza nada).
 */
export function FitnessIcon({
  name,
  size = 24,
  color = 'currentColor',
  className = '',
  title,
}: FitnessIconProps) {
  const svgString = ICONS[name as FitnessIconName];
  if (!svgString) return null;

  // Los SVGs no traen width/height — los inyectamos en la etiqueta <svg>
  // (strippeamos existentes por si acaso, luego metemos los nuevos)
  const injected = svgString
    .replace(/\s(width|height)="[^"]*"/g, '')
    .replace('<svg', `<svg width="${size}" height="${size}" class="${className}"`);

  const labelled = Boolean(title);

  return (
    <span
      style={{ color, display: 'inline-flex', lineHeight: 0 }}
      role={labelled ? 'img' : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      dangerouslySetInnerHTML={{ __html: injected }}
    />
  );
}
