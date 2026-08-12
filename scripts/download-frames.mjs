#!/usr/bin/env node

/**
 * download-frames.mjs
 *
 * Descarga el 2º frame (1.jpg) de cada ejercicio de free-exercise-db para que
 * el flipbook del explainer pueda ANIMAR el movimiento (inicio → contracción).
 *
 * download-exercises.sh borra los frames extra para ahorrar peso; este los
 * recupera con la misma optimización (resize 400px, quality 75) y en paralelo.
 *
 * Uso directo:  node scripts/download-frames.mjs
 * En regeneración: download-exercises.sh lo invoca tras copiar el catálogo
 *   (mantiene el flipbook del explainer funcionando en futuras regeneraciones).
 *
 * Output: public/exercises/<name>/1.jpg (junto a los 0.jpg existentes)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const exercises = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'src', 'lib', 'utils', 'exercises.json'), 'utf-8')
);

const targets = [];
for (const ex of exercises) {
  const imgs = ex.images || [];
  if (imgs.length < 2) continue;
  const rel = imgs[1]; // "Elbows_Back/1.jpg"
  const out = path.join(ROOT, 'public', 'exercises', rel);
  if (fs.existsSync(out)) continue; // ya descargado
  targets.push({ url: BASE + rel, out, rel });
}

console.log(`📥 ${targets.length} frames por descargar`);

let ok = 0;
let fail = 0;
const CONCURRENCY = 10;
let cursor = 0;

async function worker() {
  while (cursor < targets.length) {
    const t = targets[cursor++];
    try {
      const res = await fetch(t.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(t.out), { recursive: true });
      fs.writeFileSync(t.out, buf);
      ok++;
      if (ok % 100 === 0) console.log(`  … ${ok}/${targets.length}`);
    } catch {
      fail++;
      console.log(`  ✗ ${t.rel}`);
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`✅ Descargados ${ok}, fallidos ${fail}`);

// Optimización: resize 400 + q75 (misma que 0.jpg)
const sharp = (await import('sharp')).default;
const dirs = fs
  .readdirSync(path.join(ROOT, 'public', 'exercises'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => path.join(ROOT, 'public', 'exercises', e.name));

let compressed = 0;
for (const dir of dirs) {
  const jpg = path.join(dir, '1.jpg');
  if (fs.existsSync(jpg)) {
    try {
      const buf = await sharp(jpg).resize(400).jpeg({ quality: 75 }).toBuffer();
      fs.writeFileSync(jpg, buf);
      compressed++;
    } catch {
      // jpg corrupto → eliminar
      fs.unlinkSync(jpg);
    }
  }
}
console.log(`🗜️ Optimizados ${compressed} frames`);

const size = fs.readdirSync(path.join(ROOT, 'public', 'exercises'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .reduce((acc, e) => acc + (fs.existsSync(path.join(ROOT, 'public', 'exercises', e.name, '1.jpg')) ? 1 : 0), 0);
console.log(`📦 Ejercicios con 2 frames ahora: ${size}`);
