#!/bin/bash
# Download exercise GIFs from free-exercise-db (MIT license) → public/exercises/
set -e

echo "📥 Clonando free-exercise-db (depth 1)..."
git clone --depth 1 https://github.com/yuhonas/free-exercise-db repo-temp

echo "📁 Creando public/exercises..."
mkdir -p public/exercises

echo "📋 Copiando ejercicios..."
cp -r repo-temp/exercises/* public/exercises/

echo "🧹 Limpiando..."
rm -rf repo-temp

COUNT=$(ls public/exercises | wc -l)
echo "✅ $COUNT ejercicios descargados a public/exercises/"