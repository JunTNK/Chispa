'use client';

import {
  forwardRef,
  useId,
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type SVGProps,
} from 'react';

// ─── Props ───

export type IconBaseProps = Omit<SVGProps<SVGSVGElement>, 'title'> & {
  /** Tamaño en píxeles (width y height). Default: 28 */
  size?: number;
  /** Si está presente → icono significativo (role="img" + <title>);
   *  si ausente → icono decorativo (aria-hidden). */
  title?: string;
  /** Override del strokeWidth del icono */
  strokeWidth?: number;
  /** Draw-on animation opt-in (inyecta pathLength vía cloneElement) */
  animated?: boolean;
};

type BaseProps = IconBaseProps & {
  viewBox: string;
  /** Default strokeWidth para este icono */
  defaultStroke?: number;
};

// ─── IconBase — atributos DRY, una sola vez ───

const IconBase = forwardRef<SVGSVGElement, BaseProps>(function IconBase(
  {
    size = 28,
    title,
    strokeWidth,
    defaultStroke = 3,
    animated,
    viewBox,
    className,
    children,
    ...rest
  },
  ref,
) {
  const titleId = useId();
  const labelled = Boolean(title);

  // pathLength solo en runtime y solo si animated → markup fuente y tests intactos
  const kids = animated
    ? Children.map(children, (c) =>
        isValidElement(c)
          ? cloneElement(c as ReactElement, { pathLength: 1 } as Record<string, unknown>)
          : c,
      )
    : children;

  const cls = ['muscle-icon', animated && 'is-draw', className]
    .filter(Boolean)
    .join(' ')
    || undefined;

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? defaultStroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cls}
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-labelledby={labelled ? titleId : undefined}
      focusable={false}
      {...rest}
    >
      {labelled && <title id={titleId}>{title}</title>}
      {kids}
    </svg>
  );
});

IconBase.displayName = 'IconBase';

type Props = Omit<IconBaseProps, 'viewBox' | 'defaultStroke'>;

// ═══════════════════════════════════════════════════════════════
//  Componentes individuales
// ═══════════════════════════════════════════════════════════════

/**
 * Todo el cuerpo — estiramiento / workout stretching
 * 4 paths · viewBox 0 0 24 24 · strokeWidth=2 · stroke-rounded
 * Fuente: HugeIcons — workout-stretching
 */
export const FullBodyIcon = forwardRef<SVGSVGElement, Props>((props, ref) => (
  <IconBase ref={ref} viewBox="0 0 24 24" defaultStroke={2} {...props}>
    <path d="M16 5.5C16 6.32843 15.3284 7 14.5 7C13.6716 7 13 6.32843 13 5.5C13 4.67157 13.6716 4 14.5 4C15.3284 4 16 4.67157 16 5.5Z" />
    <path d="M14.3602 15L15.3039 14.454C16.3786 13.8323 16.9159 13.5214 16.9885 13.0784C16.9999 13.0092 17.0028 12.9391 16.9973 12.8694C16.9622 12.4229 16.4524 12.0789 15.4329 11.3907L10.7259 8.21359C8.87718 6.96577 8.45184 4.69114 9.75097 3" />
    <path d="M10.7259 8.21359C8.22588 10.7136 7 17.6324 7 21.0003" />
    <path d="M15.0002 21.0003C14.0268 19.8647 13.0257 18.3 12.0502 16.8578C11.3666 15.8474 11.0249 15.3422 10.9845 14.8132M10.7259 8.21359L13.3725 10M13.3725 10C12.5697 11.0391 12.0164 12.0207 11.6026 12.8942C11.1636 13.8209 10.9441 14.2843 10.9845 14.8132M10.9845 14.8132L8 14" />
  </IconBase>
));
FullBodyIcon.displayName = 'FullBodyIcon';

/**
 * Tren superior — six-pack / torso
 * 6 paths · viewBox 0 0 24 24 · strokeWidth=2 · stroke-rounded
 * Fuente: HugeIcons — body-part-six-pack
 */
export const UpperBodyIcon = forwardRef<SVGSVGElement, Props>((props, ref) => (
  <IconBase ref={ref} viewBox="0 0 24 24" defaultStroke={2} {...props}>
    <path d="M22 4V4.58579C22 4.7544 22 4.83871 21.9956 4.91994C21.9585 5.60243 21.6896 6.25181 21.2332 6.7606C21.1788 6.82116 21.1192 6.88077 21 7C20.8808 7.11923 20.8212 7.17884 20.7606 7.23317C20.2518 7.68957 19.6024 7.95855 18.9199 7.99559C18.8387 8 18.7544 8 18.5858 8H16.4142C16.2456 8 16.1613 8 16.0801 7.99559C15.3976 7.95855 14.7482 7.68957 14.2394 7.23317C14.1788 7.17884 14.1192 7.11923 14 7" />
    <path d="M20.5 7.5L20 10L19.3078 12.4227C19.1036 13.1374 19 13.8771 19 14.6204V14.9315C19 15.31 19.0269 15.6881 19.0804 16.0628L19.5 20" />
    <path d="M3.5 7.5L4 10L4.69219 12.4227C4.8964 13.1374 5 13.8771 5 14.6204V14.9315C5 15.31 4.97313 15.6881 4.9196 16.0628L4.5 20" />
    <path d="M2 4V4.58579C2 4.7544 2 4.83871 2.00441 4.91994C2.04145 5.60243 2.31043 6.25181 2.76683 6.7606C2.82116 6.82116 2.88077 6.88077 3 7C3.11923 7.11923 3.17884 7.17884 3.2394 7.23317C3.74819 7.68957 4.39757 7.95855 5.08006 7.99559C5.16129 8 5.2456 8 5.41421 8H7.58579C7.7544 8 7.83871 8 7.91994 7.99559C8.60243 7.95855 9.25181 7.68957 9.7606 7.23317C9.82116 7.17884 9.88077 7.11923 10 7" />
    <path d="M15 13H14C12.8954 13 12 12.1046 12 11C12 12.1046 11.1046 13 10 13H9" />
    <path d="M15 18H14C12.8954 18 12 17.1046 12 16C12 17.1046 11.1046 18 10 18H9" />
  </IconBase>
));
UpperBodyIcon.displayName = 'UpperBodyIcon';

/**
 * Tren inferior — pierna / leg
 * 3 paths · viewBox 0 0 24 24 · strokeWidth=2 · stroke-rounded
 * Fuente: HugeIcons — body-part-leg
 */
export const LowerBodyIcon = forwardRef<SVGSVGElement, Props>((props, ref) => (
  <IconBase ref={ref} viewBox="0 0 24 24" defaultStroke={2} {...props}>
    <path d="M5.00183 2C7.69316 2.31359 13.8994 3.89572 16.6428 7.74552C16.9785 8.21643 17.3319 8.54976 17.9113 8.69637C18.6361 8.87638 19.2359 9.36245 19.4537 10.0961C19.6856 10.8944 20.1138 11.7364 19.9778 12.5901C19.9257 12.9169 19.7657 13.218 19.4457 13.82L15.0988 22" />
    <path d="M4.00183 12C5.00183 13.7264 8.16622 14.5959 12.0018 13.7264C11.4156 14.0677 10.4146 14.6835 9.31712 15.9511C8.75814 16.5968 8.51959 17.4954 8.48067 18.4026C8.42865 19.615 8.24879 20.9338 7.62683 22" />
    <path d="M5.00183 7C5.00183 7 6.9608 7.28919 8.50183 8.5C9.50183 9.28571 11.4185 9.80952 12.0018 10" />
  </IconBase>
));
LowerBodyIcon.displayName = 'LowerBodyIcon';

/**
 * Core y cardio — corazón
 * 1 path · viewBox 0 0 24 24 · strokeWidth=2 · stroke-rounded
 * Fuente: HugeIcons — heart icon
 */
export const CoreCardioIcon = forwardRef<SVGSVGElement, Props>((props, ref) => (
  <IconBase ref={ref} viewBox="0 0 24 24" defaultStroke={2} {...props}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </IconBase>
));
CoreCardioIcon.displayName = 'CoreCardioIcon';

// ═══════════════════════════════════════════════════════════════
//  Registro tipado
// ═══════════════════════════════════════════════════════════════

export const MUSCLE_GROUPS = {
  full:  { label: 'Todo el cuerpo', Icon: FullBodyIcon },
  upper: { label: 'Tren superior',  Icon: UpperBodyIcon },
  lower: { label: 'Tren inferior',  Icon: LowerBodyIcon },
  core:  { label: 'Core y cardio',  Icon: CoreCardioIcon },
} as const;

export type MuscleGroupKey = keyof typeof MUSCLE_GROUPS;

export function MuscleGroupIcon({
  name,
  ...props
}: { name: MuscleGroupKey } & Props) {
  const { Icon } = MUSCLE_GROUPS[name];
  return <Icon {...props} />;
}
