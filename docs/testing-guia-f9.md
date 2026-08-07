# Guía de Validación Humana Chispa (F9)

## Qué se valida
El funnel de 5 segundos: un usuario TDAH puede **ver la acción principal e iniciar onboarding sin scroll ni interacción extra**, y las **FAQs de confianza (datos + IA) están abiertas por defecto** para reducir ansiedad.

## Protocolo (5 segundos + thumb)

### 1. Landing (0-5s)
1. Abre `http://localhost:4200` o la URL de staging.
2. **Cronometra**: ¿ ves el botón "Crear mi perfil" (hero) sin hacer scroll?
   - [ ] Sí, visible inmediatamente
   - [ ] No, tuve que scrollear → anota distancia (pixeles)
3. ¿Ves las FAQs abiertas por defecto?
   - [ ] "¿Salen mis datos del dispositivo?" visible con respuesta
   - [ ] "¿Es IA real o marketing?" visible con respuesta
4. ¿El footbar "Crear mi perfil" (pie de página) está visible sin scroll?
   - [ ] Sí (sticky)
   - [ ] No

### 2. Transición a onboarding (click → 3s)
1. Toca "Crear mi perfil" (hero o footbar).
2. Cronometra hasta que aparezca el input "¿Cómo te llamamos?":
   - Tiempo: ___ ms
   - [ ] < 3s (ideal)
   - [ ] 3-5s (aceptable)
   - [ ] > 5s (problema)
3. Califica la sensación:
   - [ ] Fluido
   - [ ] Noté demora
   - [ ] Se atoró

### 3. Feedback rápido TDAH
1. ¿La landing reduce decisiones?
   - [ ] Sí — solo un CTA claro
   - [ ] No — me costó elegir
2. ¿Las FAQs abiertas te tranquilizaron?
   - [ ] Sí, mejor sin tener que abrir nada
   - [ ] No me importa
3. ¿El thumb puede alcanzar el CTA sin estirar?
   - [ ] Sí (footer a altura de pulgar)
   - [ ] No (demasiado alto/arriba)

### Forma de reporte
Comparte este checklist completado + notas en `#feedback` de Chispa (o `hola@chispa.app`).
Incluye:
- Tiempo de carga CTA → onboarding
- Captura de pantalla si algo se ve roto
- 1 cosa que te generó ansiedad (si aplica)

## Qué NO validar (fuera de scope)
- Flujo post-onboarding (home, session, feedback loop)
- Precisión del entrenamiento adaptativo
- Integración Supabase (social graph)

---
*Guía emitida para testers internos. Revisa AGENTS.md para scripts de servidor (`npm start -p 4200`).*
