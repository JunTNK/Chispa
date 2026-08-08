/**
 * i18n coverage guard.
 *
 * Escanea estáticamente TODAS las llamadas t('literal') (literal string =
 * i18n key by definition) dentro de src/ y verifica que cada clave resuelve
 * en el diccionario EN mergeado. Cualquier clave nueva que falte su traducción
 * EN queda capturada AQUÍ, no en modo runtime (donde t() también se usa para
 * pasar datos de usuario como t(ex.name) y no podría distinguirse).
 *
 * No detecta t(variable) cuyo valor dinámico no esté registrado (p.ej.
 * plan.message del MotivationEngine) — esa es una deuda documentada.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, Dirent } from 'node:fs';
import { join } from 'node:path';
import { EN } from '@/lib/i18n/translations/index';

const SRC_ROOT = join(process.cwd(), 'src');
const SKIP_DIRS = new Set(['node_modules', '.next', 'coverage', '__tests__']);

function walk(dir: string, acc: string[]) {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      walk(p, acc);
    } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) {
      // ignora el propio archivo de traducciones y este test
      if (p.includes('src/lib/i18n/translations') || p.endsWith('i18n-coverage.test.ts')) continue;
      acc.push(p);
    }
  }
  return acc;
}

/** Extrae claves ES usadas como literal en t('...') / t("..."). */
function extractKeys(file: string): Set<string> {
  const src = readFileSync(file, 'utf8');
  const keys = new Set<string>();
  // t(  seguido de ' o "  → captura hasta el quote de cierre del mismo tipo.
  const re = /\bt\((['"])((?:[^'\\]|\\.)*?)\1(?![a-zA-Z0-9_$])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    keys.add(m[2]);
  }
  return keys;
}

/**
 * Keys "semánticas" (clave anidada `ns.name` o camelCase) — prohibidas.
 * El modelo es plano: el literal DEBE ser la frase ES (el fallback ES la pinta).
 * Si alguien introduce una key de máquina, en lang ES se ve la key cruda en
 * pantalla (bug clase 'live.start' / 'session.skipRestHint').
 */
const NESTED_KEY = /^[a-z][a-zA-Z0-9_]*\.[a-zA-Z0-9_]+$/;
const CAMEL_KEY = /^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/;

describe('i18n · cobertura de claves t() en EN', () => {
  const files = walk(SRC_ROOT, []);
  const missing = new Map<string, string[]>(); // key → files where it's used

  for (const f of files) {
    for (const key of extractKeys(f)) {
      if (!(key in EN) || EN[key] === '') {
        const abs = f.replace(process.cwd() + '/', '');
        const arr = missing.get(key) ?? [];
        if (!arr.includes(abs)) arr.push(abs);
        missing.set(key, arr);
      }
    }
  }

  it('toda clave ES usada como literal resuelve en el diccionario EN mergeado', () => {
    const msg = [...missing.entries()].map(([k, files]) => `  • "${k}" → ${files.join(', ')}`).join('\n');
    expect(missing.size, `Faltan ${missing.size} traducciones EN:\n${msg}`).toBe(0);
  });

  it('ninguna t() usa keys semánticas (clave cruda en pantalla en lang ES)', () => {
    const offenders = new Map<string, string[]>();
    for (const f of files) {
      for (const key of extractKeys(f)) {
        if (NESTED_KEY.test(key) || CAMEL_KEY.test(key)) {
          const abs = f.replace(process.cwd() + '/', '');
          const arr = offenders.get(key) ?? [];
          if (!arr.includes(abs)) arr.push(abs);
          offenders.set(key, arr);
        }
      }
    }
    const msg = [...offenders.entries()]
      .map(([k, files]) => `  • "${k}" → ${files.join(', ')} (usa una frase ES como literal)`).join('\n');
    expect(offenders.size, `Keys semánticas detectadas:\n${msg}`).toBe(0);
  });
});
