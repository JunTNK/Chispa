import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * GUARD DE FILOSOFÍA — convierte los invariantes del producto en regresión imposible.
 *
 * Escanea TODO el copy de UI (traducciones ES→EN + líneas de voz del TTS) y
 * verifica que no aparezcan patrones prohibidos: obligación, culpa encubierta,
 * presión motivacional, rachas fuera de reencuadre, comparación social, ranking,
 * shaming y urgencia falsa.
 *
 * Calibración (no borres patrones):
 * - Si un string legítimo cae, NO se elimina el patrón: se añade el reencuadre
 *   EXACTO a ALLOWED_REFRAMES. Así cada excepción queda deliberada y visible en el diff.
 */

const TARGETS = [
  "src/lib/i18n/translations", // directorio — diccionarios ES→EN
  "src/lib/utils/voice-lines.ts", // copy hablado (TTS)
];

/**
 * Frases propias de la filosofía que mencionan conceptos sensibles para
 * negarlos/reencuadrarlos (ES + EN). Se restan ANTES de buscar lo prohibido:
 * nuestro copy habla de "rachas"/"fracaso" justo para negarlos.
 */
const ALLOWED_REFRAMES = [
  // ES
  /sin rachas/gi,
  /no hay rachas/gi,
  /rachas perfectas/gi,
  /rachas que se rompen/gi,
  /sin rachas ni perfección/gi,
  /las rachas crean culpa/gi,
  /no presión ni rachas/gi, // journal.ts: nota de diseño (celebra movimiento)
  /no es (un )?fracaso/gi,
  /sin culpa/gi,
  /cero culpa/gi,
  /no es fallar/gi,
  /sin juicio/gi,
  // EN (espejo de los reencuadres ES)
  /no streaks?/gi,
  /perfect streaks?/gi,
  /streaks? create guilt/gi,
  // Técnico legítimo (validación de contraseña, no es presión motivacional)
  /password must be at least/gi,
];

/** [patrón prohibido, motivo] */
const FORBIDDEN: Array<[RegExp, string]> = [
  [/\b(debes|deberías|debés|tienes que)\b/i, "obligación (ES)"],
  [/\b(you )?(must|have to)\b/i, "obligación (EN)"],
  [/sin excusas|no excuses/i, "culpa encubierta"],
  [/no te rindas|nunca te rindas|never give up|don'?t give up/i, "presión motivacional"],
  [/mant[ée]n la racha|keep the streak|don'?t break the (chain|streak)/i, "presión de racha"],
  [/\brachas?\b/i, "racha fuera de reencuadre"],
  [/\bstreaks?\b/i, "streak"],
  [/mejor que (los )?demás|mejor que otr[oa]s|supera a otr[oa]s|better than (everyone|others)/i, "comparación social"],
  [/\b(ranking|leaderboard|top ?\d+)\b/i, "ranking"],
  [/(te )?estás quedando (atrás|behind)|fallaste|you failed|you missed/i, "shaming"],
  [/¡?(corre|entrénalo|hazlo) (ya|ahora)!/i, "urgencia falsa"],
];

function collectFiles(target: string): string[] {
  if (statSync(target).isFile()) return [target];
  return readdirSync(target)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(target, f));
}

describe("philosophy-guard: copy sin culpa, sin rachas, sin comparación social", () => {
  const files = TARGETS.flatMap(collectFiles);

  it.each(files)("%s no viola la filosofía", (file) => {
    const raw = readFileSync(file, "utf8");
    const limpio = ALLOWED_REFRAMES.reduce((s, re) => s.replace(re, " "), raw);

    const violaciones: string[] = [];
    for (const [re, motivo] of FORBIDDEN) {
      const m = limpio.match(re);
      if (m) violaciones.push(`"${m[0]}" → ${motivo}`);
    }
    expect(violaciones, `${file}:\n${violaciones.join("\n")}`).toEqual([]);
  });
});
