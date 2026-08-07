#!/bin/bash
# Download exercises from free-exercise-db (MIT license) → public/exercises/
#
# NOTA SOBRE GIFs: El repo original de free-exercise-db no incluye animation.gif
# en su branch main. ExerciseMedia espera `animation.gif` pero cae al JPG estático
# (0.jpg) cuando el GIF no existe. Si en el futuro se añaden GIFs, basta con
# clonar con `git lfs` o descargarlos manualmente.
#
# Compresión: elimina frames extras + comprime 0.jpg a calidad 75 + resize 400px
set -e

echo "📥 Clonando free-exercise-db (depth 1)..."
git clone --depth 1 https://github.com/yuhonas/free-exercise-db repo-temp

echo "📁 Creando public/exercises..."
mkdir -p public/exercises

echo "📋 Copiando ejercicios..."
cp -r repo-temp/exercises/* public/exercises/

echo "🧹 Limpiando clon..."
rm -rf repo-temp

# Compresión: elimina frames extras + comprime 0.jpg a calidad 75 + resize 400px
echo "🗜️ Optimizando assets..."
node -e "
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.name.endsWith('.jpg') && entry.name !== '0.jpg') {
      fs.unlinkSync(fullPath);
    }
  }
}

processDir('public/exercises');

const dirs = fs.readdirSync('public/exercises', { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => path.join('public/exercises', e.name));

let compressed = 0;
for (const dir of dirs) {
  const jpg = path.join(dir, '0.jpg');
  if (fs.existsSync(jpg)) {
    sharp(jpg).resize(400).jpeg({ quality: 75 }).toBuffer()
      .then(buf => { fs.writeFileSync(jpg, buf); compressed++; });
  }
}

// Wait for all async writes
setTimeout(() => console.log('✅ ' + compressed + ' imágenes optimizadas'), 2000);
"

COUNT=$(ls public/exercises | wc -l)
echo "✅ $COUNT ejercicios descargados a public/exercises/"
echo "💡 Tamaño: $(du -sh public/exercises | cut -f1)"