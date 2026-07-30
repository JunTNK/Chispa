# 🏋️ Guía de componentes: Iconos fitness v3.2.0

Guía interna para desarrolladores. Describe dos sistemas de iconos SVG fitness:

1. **4 iconos de grupo muscular** (`muscle-icons.tsx`) — para el selector de grupo muscular
2. **108+ iconos inline** en el grid "Toque para agregar" (`create-workout-screen.tsx`) — con resolución por ID exacto + fallback por músculo

**Versión:** v3.2.0 — iconos HugeIcons + 4 iconos inline propios + mapeo expandido.

---

## Índice

1. [Descripción general](#1-descripción-general)
2. [Componentes](#2-componentes) — 4 iconos de grupo muscular (HugeIcons)
3. [Props](#3-props)
4. [Uso](#4-uso)
5. [Paleta de color](#5-paleta-de-color)
6. [Accesibilidad](#6-accesibilidad)
7. [Pruebas](#7-pruebas)
8. [Arquitectura del SVG](#8-arquitectura-del-svg)
9. [EXERCISE_ICON — Mapeo de 108 ejercicios](#9-exercise_icon--mapeo-de-108-ejercicios)
10. [Fallback por músculo](#10-fallback-por-músculo)
11. [Preguntas frecuentes](#11-preguntas-frecuentes)
12. [FitnessIcon — Componente genérico de 24 iconos](#12-fitnessicon--componente-genérico-de-24-iconos)

---

## 1. Descripción general

Cuatro componentes de icono en línea (inline SVG) que representan grupos
musculares. Estilo **stroke-rounded** con trazo continuo (`stroke`), sin relleno
(`fill="none"`), diseñados para integrarse con la paleta de la app mediante
`stroke="currentColor"`.

Fuente: [HugeIcons](https://hugeicons.com) — iconos gratuitos stroke-rounded.

**Archivo fuente:** `src/components/ui/muscle-icons.tsx`

| Componente | Grupo muscular | ViewBox | Trazo default | Elementos | Icono HugeIcons |
|---|---|---|---|---|---|
| `FullBodyIcon` | Todo el cuerpo | `0 0 24 24` | 2px | 4 `<path>` | [workout-stretching](https://hugeicons.com/icon/workout-stretching) |
| `UpperBodyIcon` | Tren superior | `0 0 24 24` | 2px | 6 `<path>` | [body-part-six-pack](https://hugeicons.com/icon/body-part-six-pack) |
| `LowerBodyIcon` | Tren inferior | `0 0 24 24` | 2px | 3 `<path>` | [body-part-leg](https://hugeicons.com/icon/body-part-leg) |
| `CoreCardioIcon` | Core y cardio | `0 0 24 24` | 2px | 1 `<path>` | heart (stroke-rounded) |

### Novedades v3.2

| Feature | Descripción |
|---|---|
| **4 iconos inline propios** | PushIcon, PullIcon, PressIcon, BridgeIcon para cubrir pecho, espalda, hombros y glúteos |
| **108 ejercicios mapeados** | EXERCISE_ICON mapea 108 IDs exactos del catálogo a 16 variantes de SVG |
| **Fallback por músculo** | Si un ejercicio no tiene icono exacto, se usa un icono genérico según su tipo muscular |
| **IDs verificados contra el catálogo** | Todos los keys en EXERCISE_ICON existen realmente en `exercises.json` |
| **Grid responsive** | Iconos `w-7 h-7 sm:w-8 sm:h-8` (28px → 32px) |
| **SvgIcon helper** | Función compartida que aplica viewBox 24×24, strokeWidth 2 y stroke-rounded |

### Novedades v3.1

| Feature | Descripción |
|---|---|
| **Iconos HugeIcons** | 3 de 4 iconos reemplazados con SVGs específicos de HugeIcons: workout-stretching, body-part-six-pack, body-part-leg |
| **Paths por icono** | Cada icono tiene su propio número de paths según el diseño original (4, 6, 3, 1) |
| **Atribución** | Enlaces directos a cada icono en hugeicons.com |
| **Accesibilidad preservada** | Toda la arquitectura v2 se mantiene (IconBase, forwardRef, dual a11y, animated) |

### Novedades v2 (heredadas)

| Feature | Descripción |
|---|---|
| `IconBase` | Atributos DRY: 11 atributos ×4 → 1 sola definición |
| `forwardRef` | Los 4 iconos exponen `ref` para acceso programático al `<svg>` |
| `title` prop | Dual: presente → significativo; ausente → decorativo |
| `strokeWidth` prop | Override del trazo por icono, con default por componente |
| `animated` prop | Draw-on animation opt-in via `pathLength` + `cloneElement` |
| `MUSCLE_GROUPS` | Registro tipado `as const` |
| `MuscleGroupIcon` | Componente resolutor con tipo seguro |
| `MuscleGroupKey` | Tipo unión: `'full' \| 'upper' \| 'lower' \| 'core'` |

---

## 2. Componentes

### 2.1 `FullBodyIcon` 🏋️

Figura en **estiramiento (workout stretching)** — brazos elevados, torso
inclinado, una pierna estirada hacia atrás.

```
    ◯          ← cabeza (path 1)
   /|          ← brazo derecho elevado
    |\         ← brazo izquierdo extendido
    |          ← torso
   / \         ← pierna atrás + apoyo
```

**Fuente:** [`workout-stretching`](https://hugeicons.com/icon/workout-stretching) — HugeIcons

**Elementos:** 4 `<path>`

### 2.2 `UpperBodyIcon` 💪

Torso con **six-pack** — brazos en V hacia arriba, abdominales marcados.

```
  \  |  /      ← brazos elevados
   \ | /       ← hombros
    ───        ← línea de hombros
    ███        ← abdominales (paths 5-6)
    ███
```

**Fuente:** [`body-part-six-pack`](https://hugeicons.com/icon/body-part-six-pack) — HugeIcons

**Elementos:** 6 `<path>`

### 2.3 `LowerBodyIcon` 🦵

**Pierna** — desde la cadera hasta el pie, con indicación de movimiento.

```
     ●         ← cadera (path 1 inicio)
      \
       \
        \
         ◯    ← rodilla
          \
           ┘  ← pie
```

**Fuente:** [`body-part-leg`](https://hugeicons.com/icon/body-part-leg) — HugeIcons

**Elementos:** 3 `<path>`

### 2.4 `CoreCardioIcon` ❤️

Corazón — símbolo universal de cardio y salud cardiovascular.

```
  ♥  ♥      ← lóbulo izquierdo
 ♥  ♥  ♥    ← lóbulo derecho
   ♥ ♥
    ▼        ← punta del corazón
```

**Elementos:** 1 `<path>` (trazado continuo con curvas Bezier)

---

## 3. Props

### `IconBaseProps` (compartida por todos los iconos)

```typescript
type IconBaseProps = Omit<SVGProps<SVGSVGElement>, 'title'> & {
  size?: number;          // px · default: 28
  title?: string;         // presente → role="img"; ausente → aria-hidden
  strokeWidth?: number;   // override del trazo default del icono
  animated?: boolean;     // draw-on animation opt-in
};
```

| Prop | Type | Default | Descripción |
|---|---|---|---|
| `size` | `number` | `28` | Ancho/alto del SVG en px |
| `title` | `string` | `undefined` | **Dual:** presente → icono significativo; ausente → decorativo |
| `strokeWidth` | `number` | `2` | Override del trazo (todos los iconos default 2) |
| `animated` | `boolean` | `false` | Animación de trazado al aparecer |
| `className` | `string` | `undefined` | Clases CSS adicionales |
| `ref` | `Ref<SVGSVGElement>` | — | forwardRef al elemento `<svg>` |

También acepta cualquier atributo nativo de `<svg>` (excepto `title`).

---

## 4. Uso

### 4.1 Importación

```typescript
// Individual (v1 compatible)
import {
  FullBodyIcon,
  UpperBodyIcon,
  LowerBodyIcon,
  CoreCardioIcon,
} from '@/components/ui/muscle-icons';

// Registro tipado (v2)
import {
  MuscleGroupIcon,
  MUSCLE_GROUPS,
} from '@/components/ui/muscle-icons';
import type { MuscleGroupKey } from '@/components/ui/muscle-icons';
```

### 4.2 Básico

```tsx
<FullBodyIcon />                          {/* 28×28px, decorativo */}
<UpperBodyIcon size={48} />               {/* 48×48px, decorativo */}
<LowerBodyIcon className="opacity-80" />  {/* con opacidad */}
<CoreCardioIcon size={100} />             {/* 100×100px */}
```

### 4.3 Con title (significativo — recommended)

```tsx
<span className="text-[#f5a623]">
  <FullBodyIcon title="Todo el cuerpo" size={28} />
</span>
```

### 4.4 Con animated (draw-on)

```tsx
<FullBodyIcon title="Todo el cuerpo" animated />
```

Requiere el CSS de draw-on (incluido en `globals.css` — ver sección 8.3).

### 4.5 Grid tipado con MuscleGroupIcon

```tsx
import { MuscleGroupIcon } from '@/components/ui/muscle-icons';
import type { MuscleGroupKey } from '@/components/ui/muscle-icons';

const ORDER: MuscleGroupKey[] = ['full', 'upper', 'lower', 'core'];

<MuscleGroupIcon name="full" size={28} title="Todo el cuerpo" />
<MuscleGroupIcon name="upper" size={28} title="Tren superior" animated />
```

### 4.6 Registro tipado

```typescript
MUSCLE_GROUPS.full  // → { label: 'Todo el cuerpo', Icon: FullBodyIcon }
MUSCLE_GROUPS.upper // → { label: 'Tren superior', Icon: UpperBodyIcon }
```

---

## 5. Paleta de color

Los iconos usan `stroke="currentColor"`. El color se define en el contenedor:

| Clase | Color | Uso |
|---|---|---|
| `text-[#f5a623]` | Ámbar | Activo / hover |
| `text-[#8b929b]` | Gris | Inactivo |
| `text-[#f3ede1]` | Hueso | Sobre fondo oscuro |

---

## 6. Accesibilidad

### Modo significativo (con `title`)

```tsx
<FullBodyIcon title="Todo el cuerpo" />
```

Renderiza:
```html
<svg role="img" aria-labelledby=":r0:" focusable="false">
  <title id=":r0:">Todo el cuerpo</title>
  ...
</svg>
```

### Modo decorativo (sin `title`)

```tsx
<FullBodyIcon />
```

Renderiza:
```html
<svg aria-hidden="true" focusable="false" class="muscle-icon">
  ...
</svg>
```

### Regla práctica

| Contexto | title | Modo |
|---|---|---|
| El icono está acompañado de texto que ya describe el grupo | omitir | Decorativo |
| El icono está solo o es el único indicador visual | `title="..."` | Significativo |

---

## 7. Pruebas

| Archivo | Tipo | Tests | Lo que verifica |
|---|---|---|---|
| Archivo | Tipo | Tests | Lo que verifica |
|---|---|---|---|
| `muscle-icons.test.tsx` | Unitario | ~48 | Renderizado, dual a11y, forwardRef, animated, strokeWidth, registro tipado |
| `muscle-icons-axe.test.tsx` | Accesibilidad | 13 | axe-core WCAG 2A/2AA en ambos modos (significativo + decorativo) |
| `muscle-icons-snapshot.test.tsx` | Snapshot | 16 | Baseline visual: decorativo, significativo, animado, combinado |
| `muscle-icons-regression.test.tsx` | Regresión | ~28 | Conteo exacto de elementos (FullBody: 4, Upper: 6, Lower: 3, Core: 1), atributos, estructura geométrica |

```bash
# Solo tests de iconos de grupo muscular
npx vitest run src/components/ui/__tests__/muscle-icons

# Tests completos (incluye training)
npm test
```

---

## 8. Arquitectura del SVG

### 8.1 IconBase (componente base)

Todos los iconos delegan en `IconBase`, que maneja:

- Atributos compartidos (`fill="none"`, `stroke="currentColor"`, etc.)
- Accesibilidad dual (`role` / `aria-hidden` según `title`)
- `useId` para generar IDs únicos de `<title>`/`aria-labelledby`
- `cloneElement` para inyectar `pathLength={1}` solo en modo animado
- `forwardRef` al `<svg>` raíz

```tsx
<IconBase ref={ref} viewBox="0 0 24 24" defaultStroke={2} {...props}>
  <path d="..." /> {/* cada icono aporta solo su geometría */}
</IconBase>
```

### 8.2 Atributos generados

| Atributo | Sin title | Con title |
|---|---|---|
| `role` | — | `"img"` |
| `aria-hidden` | `"true"` | — |
| `aria-labelledby` | — | `<useId>` |
| `focusable` | `"false"` | `"false"` |
| `class` | `muscle-icon` | `muscle-icon` (+ `is-draw` si animated) |

### 8.3 Draw-on animation (CSS)

Incluido en `src/app/globals.css`:

```css
.muscle-icon.is-draw > * {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation: midraw .85s cubic-bezier(.6,.1,.2,1) forwards;
}
.muscle-icon.is-draw > *:nth-child(2) { animation-delay: .06s; }
.muscle-icon.is-draw > *:nth-child(3) { animation-delay: .12s; }

@keyframes midraw { to { stroke-dashoffset: 0; } }

@media (prefers-reduced-motion: reduce) {
  .muscle-icon.is-draw > * { animation: none; stroke-dashoffset: 0; }
}
```

> **Nota:** El selector `> *` en lugar de `[stroke]` es porque los hijos heredan
> `stroke` del SVG padre via cascada, no como atributo explícito.

### 8.4 ViewBox unificado

Todos los iconos usan viewBox `0 0 24 24` y `defaultStroke={2}`, lo que
permite renderizarlos en las mismas condiciones sin ajustes por icono.

---

## 9. EXERCISE_ICON — Mapeo de 108 ejercicios

**Archivo fuente:** `src/components/training/create-workout-screen.tsx`

### 9.1 SvgIcon helper

Función que envuelve paths SVG con el estilo unificado de la app:

```tsx
const SvgIcon = (paths: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
       className="w-7 h-7 sm:w-8 sm:h-8">
    {paths}
  </svg>
);
```

### 9.2 Los 4 iconos de categoría

Diseñados inline para cubrir grupos musculares sin icono de HugeIcons específico:

| Icono | SVG | Categoría | Descripción |
|---|---|---|---|
| **PushIcon** | `circle cx=12 cy=4 r=2` + `M6 8c2 2 4 3 6 1/18 8c-2 2-4 3-6 1/12 6v6` | Pecho | Brazos extendiendo desde el pecho (press/pec fly) |
| **PullIcon** | `circle cx=12 cy=3 r=2` + `M7 5c1 3 2 5 5 6/17 5c-1 3-2 5-5 6/12 5v6` | Espalda | Brazos tirando hacia abajo (row/lat pulldown) |
| **PressIcon** | `circle cx=12 cy=5 r=2` + `M9 9c1-2 1-4 3-7/15 9c-1-2-1-4-3-7/12 7v5` | Hombros | Brazos elevándose sobre la cabeza (overhead press) |
| **BridgeIcon** | `circle cx=12 cy=3 r=2` + `M12 5v3/M7 13c1 3 3 4 5 4...` | Glúteos | Figura en puente (hip thrust/glute bridge) |

### 9.3 Los 12 iconos de ejercicio específico

Diseños inline únicos que cubren los patrones de movimiento más comunes.
Cada SVG se reutiliza en múltiples IDs del catálogo que comparten la misma mecánica.

| SVG ID | Descripción | Tags | Ejercicios de ejemplo |
|---|---|---|---|
| **Sit-Up** | Cabeza + torso + piernas | `core · crunch` | `3_4_Sit-Up`, `Crunch_-_Hands_Overhead`, `Jackknife_Sit-Up` |
| **Crunch Machine** | Rect + líneas centrales | `máquina · abdominales` | `Ab_Crunch_Machine`, `Cable_Crunch` |
| **Ab Roller** | 2 ruedas + mango | `rueda · rollout` | `Ab_Roller`, `Barbell_Ab_Rollout` |
| **Air Bike** | 2 pedales + torso | `cardio · bicicleta` | `Air_Bike`, `Elbow_to_Knee`, `Running_Treadmill`, `48ee1385-...` (Burpee) |
| **Heel Touchers** | Torso + brazos extendidos | `core · talones` | `Alternate_Heel_Touchers`, `Plank`, `Hanging_Leg_Raise` |
| **Hamstring** | Círculo + líneas de pierna | `piernas · isquiotibiales` | `90_90_Hamstring`, `Ball_Leg_Curl`, `Goblet_Squat`, `Barbell_Full_Squat` |
| **Adductor** | Círculo + piernas abiertas | `ingle · aductores` | `Adductor`, `Adductor_Groin`, `Band_Hip_Adductions` |
| **Quad Stretch** | Círculo + pierna doblada | `cuádriceps · estiramiento` | `All_Fours_Quad_Stretch` |
| **Kettlebell** | Campana + asa + bola | `pesas · equipamiento` | `Advanced_Kettlebell_Windmill`, `Alternating_Kettlebell_Press` |
| **TRX** | Cuerdas + agarres | `suspensión · brazos` | `Alternate_Hammer_Curl` |
| **Bicep Curl** | Brazo curvo + mancuerna | `bíceps · curl` | `Alternate_Incline_Dumbbell_Curl`, `Barbell_Curl`, `Concentration_Curls` |
| **Squat** | Círculo + piernas flexionadas | `piernas · sentadilla` | `Barbell_Full_Squat`, `Goblet_Squat` |

### 9.4 Cobertura del catálogo

Datos reales verificados contra el catálogo de 1,222 ejercicios (`exercises.json`):

| Métrica | Valor |
|---|---|
| Total ejercicios en catálogo | **1,222** |
| Mapeo exacto en `EXERCISE_ICON` | **108 (8.8%)** |
| Usan fallback por músculo | **1,114 (91.2%)** |
| Cobertura total | **100%** |

### 9.5 Sistema de resolución

```tsx
function ExerciseIcon({ id, muscle }: { id: string; muscle: string }) {
  const icon = EXERCISE_ICON[id] ?? MUSCLE_FALLBACK[muscle] ?? null;
  return icon ? (
    <span className="text-[#94a0b8]/70 group-hover:text-[#ffb454]
                    transition-colors duration-200">
      {icon}
    </span>
  ) : null;
}
```

El orden de resolución es:
1. Buscar por ID exacto en `EXERCISE_ICON`
2. Si no encuentra, usar el fallback por tipo de músculo
3. Si no hay fallback, no renderizar icono (solo texto)

## 10. Fallback por músculo

Para los ejercicios que no tienen un ID mapeado en `EXERCISE_ICON`, se usa
`MUSCLE_FALLBACK` que asigna un icono genérico según el tipo muscular:

```text
EXERCISE_ICON[id]  →  MUSCLE_FALLBACK[muscle]  →  null
   (exacto)            (por tipo muscular)        (sin icono)
```

| Tipo muscular | Icono fallback |
|---|---|
| `core` | Sit-Up |
| `piernas` | Hamstring Stretch |
| `brazos` | Bicep Curl |
| `gluteos` | BridgeIcon |
| `pecho` | PushIcon |
| `espalda` | PullIcon |
| `hombros` | PressIcon |
| `cardio` | Air Bike |

Esto asegura que **todo** ejercicio en el grid "Toque para agregar" tenga
un icono visible, incluso si su ID no está en el mapeo exacto. La cobertura
real del catálogo es:

- **1,222** ejercicios totales
- **108** con mapeo exacto (8.8%)
- **1,114** usan fallback (91.2%)
- **100%** cobertura total

## 11. Preguntas frecuentes

**P: ¿v3 rompe el código existente?**
R: La API es 100% compatible. Las props son las mismas que v2. Solo cambia
la geometría visual de los iconos.

**P: ¿Puedo cambiar el color del icono?**
R: Sí, envuelve en un `span` o `div` con `className="text-[color]"`.

**P: ¿Cómo accedo al SVG desde fuera?**
R: Usa `ref`:
```tsx
const ref = useRef<SVGSVGElement>(null);
<FullBodyIcon ref={ref} title="..." />
```

**P: ¿Qué pasa con `prefers-reduced-motion`?**
R: La animación draw-on se desactiva automáticamente si el usuario tiene
activada esta preferencia. También puedes desactivarla manualmente no
pasando `animated`.

**P: ¿Cómo animo el trazado?**
R: Añade `animated` al icono y el CSS de draw-on. El
`pathLength={1}` se inyecta vía `cloneElement` solo en runtime.

**P: ¿Puedo usar `MuscleGroupIcon` con un key dinámico?**
R: Sí, pero necesitas type assertion si el valor viene de una API:
```tsx
<MuscleGroupIcon name={key as MuscleGroupKey} />
```

**P: El snapshot falló, ¿qué hago?**
R: Regenera con `npx vitest run --update`. Si el cambio fue intencional,
ejecuta los tests de regresión estructural primero para confirmar que la
estructura coincide con lo esperado.

**P: ¿De dónde vienen estos iconos?**
R: De [HugeIcons](https://hugeicons.com), iconos stroke-rounded gratuitos:
- `FullBodyIcon` → [`workout-stretching`](https://hugeicons.com/icon/workout-stretching)
- `UpperBodyIcon` → [`body-part-six-pack`](https://hugeicons.com/icon/body-part-six-pack)
- `LowerBodyIcon` → [`body-part-leg`](https://hugeicons.com/icon/body-part-leg)
- `CoreCardioIcon` → heart (stroke-rounded nativo del set original)

Adaptados como componentes React con la arquitectura v2 de CHISPA (IconBase,
forwardRef, dual a11y, animated, typed registry).

**P: ¿Por qué se unificó el viewBox?**
R: Para eliminar inconsistencias. Antes cada icono tenía su propio viewBox
(120×120, 180×80) y strokeWidth (3, 2.5). Ahora todos comparten 24×24 y
strokeWidth 2.

---

## 12. FitnessIcon — Componente genérico de 24 iconos

**Archivo fuente:** `src/components/ui/fitness-icon.tsx`
**Datos:** `src/lib/utils/fitness-icons.ts`

Componente genérico que renderiza cualquiera de los 24 SVGs del pack HugeIcons.
A diferencia de `MuscleGroupIcon` (que tiene 4 iconos fijos), `FitnessIcon`
busca por ID en un registro tipado de 24 iconos.

### 12.1 Props

```typescript
interface FitnessIconProps {
  name: FitnessIconName | string;  // ID del icono (ej: 'dumbbell', 'running')
  size?: number;                    // px · default: 24
  color?: string;                   // stroke color · default: 'currentColor'
  className?: string;               // clases CSS para el <svg>
  title?: string;                   // presente → role="img"; ausente → aria-hidden
}
```

| Prop | Type | Default | Descripción |
|---|---|---|---|
| `name` | `FitnessIconName \| string` | — | ID del icono (ver tabla §12.5). Si no existe, no renderiza nada |
| `size` | `number` | `24` | Ancho/alto del SVG en px |
| `color` | `string` | `'currentColor'` | Color del stroke. Usa `currentColor` para heredar de Tailwind |
| `className` | `string` | `''` | Clases CSS inyectadas en el `<svg>` |
| `title` | `string` | `undefined` | Dual: presente → significativo; ausente → decorativo |

### 12.2 Uso

```tsx
import { FitnessIcon } from '@/components/ui/fitness-icon';

{/* Tamaño por defecto 24×24, hereda color del padre */}
<FitnessIcon name="dumbbell" />

{/* Tamaño personalizado + color vía Tailwind */}
<span className="text-amber-500">
  <FitnessIcon name="running" size={32} />
</span>

{/* Color vía prop (inline) */}
<FitnessIcon name="fire" size={48} color="#ff6b5e" />

{/* Con título accesible */}
<FitnessIcon name="core" title="Abdominales" size={28} />

{/* Con clases adicionales */}
<FitnessIcon name="target" className="opacity-70 hover:opacity-100 transition-opacity" />
```

### 12.3 Data layer — `fitness-icons.ts`

El archivo de datos exporta:

| Export | Tipo | Descripción |
|---|---|---|
| `ICONS` | `Record<string, string>` | Mapa de 24 IDs → string SVG completo |
| `FitnessIconName` | `type` | Unión de los 24 IDs válidos |
| `ICONS_META` | `Record<FitnessIconName, {...}>` | Metadata: nombre, categoría, descripción, número de paths |
| `ICONS_BY_CATEGORY` | `readonly` array | 5 categorías con sus iconos agrupados |

```typescript
import { ICONS, ICONS_META, ICONS_BY_CATEGORY } from '@/lib/utils/fitness-icons';
import type { FitnessIconName } from '@/lib/utils/fitness-icons';

// Verificar si un ID es válido
const isValid = 'dumbbell' satisfies FitnessIconName;

// Obtener metadata
const meta = ICONS_META['running'];
// → { name: 'Correr', category: 'Actividades', desc: 'Running / Cardio', paths: 6 }

// Iterar por categoría
ICONS_BY_CATEGORY.forEach(cat => {
  console.log(cat.id);       // 'Grupos Musculares', 'Equipamiento', etc.
  console.log(cat.icons);    // ['full-body', 'upper-body', ...]
});
```

### 12.4 Accesibilidad

Igual que `MuscleGroupIcon`:

| Modo | `title` | Resultado |
|---|---|---|
| Significativo | `"..."` | `role="img"` + `aria-label` |
| Decorativo | omitido | `aria-hidden="true"` |

### 12.5 Tabla de los 24 iconos

#### Grupos Musculares

| ID | Nombre | Paths | Descripción |
|---|---|---|---|
| `full-body` | Todo el cuerpo | 5 | Full body / Jumping jack |
| `upper-body` | Tren superior | 5 | Upper body / Torso |
| `lower-body` | Tren inferior | 4 | Lower body / Legs |
| `core` | Core y Abs | 3 | Core / Abs grid |

#### Equipamiento

| ID | Nombre | Paths | Descripción |
|---|---|---|---|
| `dumbbell` | Pesas | 5 | Dumbbell / Weights |
| `kettlebell` | Kettlebell | 2 | Kettlebell / Russian |
| `bench-press` | Press de banca | 6 | Bench press |
| `jump-rope` | Saltar cuerda | 2 | Jump rope / Skipping |

#### Actividades

| ID | Nombre | Paths | Descripción |
|---|---|---|---|
| `running` | Correr | 6 | Running / Cardio |
| `cycling` | Ciclismo | 4 | Cycling / Bike |
| `swimming` | Natación | 3 | Swimming / Pool |
| `yoga` | Yoga | 4 | Yoga / Meditation |
| `boxing` | Boxeo | 2 | Boxing / Glove |

#### Métricas y Salud

| ID | Nombre | Paths | Descripción |
|---|---|---|---|
| `timer` | Cronómetro | 4 | Timer / Stopwatch |
| `fire` | Calorías | 1 | Calories / Fire |
| `chart` | Progreso | 5 | Progress / Chart |
| `target` | Objetivo | 3 | Target / Goal |
| `trophy` | Logro | 5 | Achievement / Trophy |

#### Bienestar

| ID | Nombre | Paths | Descripción |
|---|---|---|---|
| `nutrition` | Nutrición | 2 | Diet / Apple |
| `water` | Hidratación | 1 | Hydration / Water drop |
| `sleep` | Descanso | 3 | Rest / Sleep |
| `energy` | Energía | 1 | Energy / Power |
| `shaker` | Proteína | 3 | Protein / Shaker |
| `biceps` | Fuerza | 2 | Strength / Biceps |

### 12.6 Integración con MUSCLE_ICON

Los componentes `create-workout-screen.tsx` y `quick-log-screen.tsx` usan
`FitnessIcon` en su mapeo `MUSCLE_ICON` para mostrar iconos en las listas
de resultados de búsqueda:

```typescript
const MUSCLE_ICON: Record<string, React.ReactNode> = {
  piernas: <FitnessIcon name="lower-body" size={20} />,
  gluteos: <FitnessIcon name="lower-body" size={20} />,
  pecho:   <FitnessIcon name="bench-press" size={20} />,
  espalda: <FitnessIcon name="upper-body" size={20} />,
  hombros: <FitnessIcon name="upper-body" size={20} />,
  brazos:  <FitnessIcon name="biceps" size={20} />,
  core:    <FitnessIcon name="core" size={20} />,
  cardio:  <FitnessIcon name="running" size={20} />,
};
```

### 12.7 Implementación

El componente usa `dangerouslySetInnerHTML` para inyectar el SVG con tamaño
y clases dinámicos. Es seguro porque las strings SVG vienen del código
fuente, no de entrada de usuario:

```typescript
export function FitnessIcon({ name, size = 24, color = 'currentColor', className = '', title }: FitnessIconProps) {
  const svgString = ICONS[name as FitnessIconName];
  if (!svgString) return null;

  // Los SVGs no traen width/height — se inyectan
  const injected = svgString
    .replace(/\\s(width|height)="[^"]*"/g, '')
    .replace('<svg', `<svg width="${size}" height="${size}" class="${className}"`);

  return (
    <span
      style={{ color, display: 'inline-flex', lineHeight: 0 }}
      role={title ? 'img' : undefined}
      aria-label={title ? title : undefined}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: injected }}
    />
  );
}
```

### 12.8 Vs. MuscleGroupIcon

| Aspecto | `MuscleGroupIcon` | `FitnessIcon` |
|---|---|---|
| Iconos disponibles | 4 (fijos) | 24 (registro tipado) |
| Uso principal | Cards de selección de foco | MUSCLE_ICON, docs, uso general |
| `forwardRef` | ✅ | ❌ (usar `className`) |
| `animated` (draw-on) | ✅ | ❌ |
| `strokeWidth` override | ✅ | ❌ (fijo en 2px) |
| `dangerouslySetInnerHTML` | ❌ (JSX directo) | ✅ (strings SVG) |

---

> **Última actualización:** Julio 2026
> **Versión:** v3.2.0
> **Mantenedor:** Equipo frontend Chispa