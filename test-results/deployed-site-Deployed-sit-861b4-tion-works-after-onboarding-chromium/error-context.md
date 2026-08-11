# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: deployed-site.spec.ts >> Deployed site: navigation works after onboarding
- Location: e2e/deployed-site.spec.ts:113:5

# Error details

```
TimeoutError: locator.waitFor: Timeout 20000ms exceeded.
Call log:
  - waiting for locator('input').first() to be visible

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - main [ref=e4]:
      - heading "CHISPA" [level=1] [ref=e14]
      - paragraph [ref=e15]:
        - text: La IA que se adapta a
        - emphasis [ref=e16]: tu cerebro.
      - paragraph [ref=e17]: Entrenamiento adaptativo para TDAH y neurodivergencias.
      - generic [ref=e18]:
        - generic [ref=e19]: Menos decisiones
        - generic [ref=e22]: Más movimiento
        - generic [ref=e26]: Cero culpa
      - button "Crear mi perfil" [active] [ref=e31] [cursor=pointer]
      - generic [ref=e32]:
        - paragraph [ref=e33]: Estos retos los conoces
        - generic [ref=e34]:
          - paragraph [ref=e37]: Parálisis por decisión · Demasiadas opciones te paralizan. CHISPA reduce la elección a una.
          - paragraph [ref=e40]: Culpa por las pausas · Detenerte no es fallar. Recargar es parte del progreso.
          - paragraph [ref=e43]: Rutinas rotas · No se trata de rachas perfectas. De volver, sin juicio.
      - paragraph [ref=e45]: "Así funciona CHISPA: 80% algoritmos · 15% agentes · 5% LLM que comunica, nunca decide. Hacer algo hoy vence a hacerlo perfecto."
      - generic [ref=e46]:
        - paragraph [ref=e47]: Nuestra historia
        - paragraph [ref=e48]: "CHISPA nació del fracaso de apps que no entienden el cerebro TDAH. Se está construyendo activamente, sin rachas ni perfección: solo movimiento real, paso a paso."
        - paragraph [ref=e49]: Hoja de ruta pública
        - list [ref=e50]:
          - listitem [ref=e51]:
            - generic [ref=e53]:
              - text: "Estado: en desarrollo activo. Tu feedback construye la hoja de ruta."
              - link "Escríbenos" [ref=e54] [cursor=pointer]:
                - /url: mailto:hola@chispa.app?subject=Feedback%20CHISPA
          - listitem [ref=e55]:
            - generic [ref=e57]: El motor ya corre 80/15/5. Tus datos nunca salen sin tu OK.
          - listitem [ref=e58]:
            - generic [ref=e60]: "En construcción: feed social cooperativo y analytics. La competencia es opcional, contra tu yo pasado, nunca contra otros."
      - generic [ref=e61]:
        - paragraph [ref=e65]: Qué verás al entrar
        - paragraph [ref=e79]: Una rutina, un botón, cero decisiones.
      - generic [ref=e80]:
        - paragraph [ref=e81]: Preguntas frecuentes
        - generic [ref=e82]:
          - group [ref=e83]:
            - generic "¿Por qué solo una opción?" [ref=e84] [cursor=pointer]
          - group [ref=e87]:
            - generic "¿Por qué no hay rachas?" [ref=e88] [cursor=pointer]
          - group [ref=e91]:
            - generic "¿Salen mis datos del dispositivo?" [ref=e92] [cursor=pointer]
            - paragraph [ref=e95]: No. El 80% de algoritmos es local; el LLM corre on-device. Tus datos nunca salen sin tu OK.
          - group [ref=e96]:
            - generic "¿Es IA real o marketing?" [ref=e97] [cursor=pointer]
            - paragraph [ref=e100]: 80% algoritmos · 15% agentes · 5% LLM on-device (Qwen2.5). La IA decide patrones; tú decides moverte.
          - group [ref=e101]:
            - generic "¿Es seguro para TDAH?" [ref=e102] [cursor=pointer]
          - group [ref=e105]:
            - generic "¿Cuánta cuesta?" [ref=e106] [cursor=pointer]
      - generic [ref=e109]:
        - generic [ref=e110]:
          - generic [ref=e111]:
            - generic [ref=e112]: 80%
            - generic [ref=e113]: algoritmos
          - generic [ref=e114]:
            - generic [ref=e115]: 15%
            - generic [ref=e116]: modelos
          - generic [ref=e117]:
            - generic [ref=e118]: 5%
            - generic [ref=e119]: LLM
        - generic [ref=e120]: Tus datos viven en tu dispositivo
        - link "feedback@chispa.app" [ref=e124] [cursor=pointer]:
          - /url: mailto:feedback@chispa.app?subject=%5BCHISPA%5D%20Feedback%20de%20usuario
    - generic [ref=e126]:
      - button "Crear mi perfil" [ref=e127]
      - button "Iniciar sesión" [ref=e128]
  - alert [ref=e129]
```

# Test source

```ts
  25  |   await ctaBtn.waitFor({ state: 'visible', timeout: 15000 });
  26  |   await ctaBtn.scrollIntoViewIfNeeded();
  27  |   await page.waitForTimeout(1000); // Wait for any initial busy state
  28  | 
  29  |   // Ensure button is not busy before clicking
  30  |   await expect(ctaBtn).not.toHaveAttribute('aria-busy', 'true', { timeout: 5000 });
  31  |   await ctaBtn.click();
  32  | 
  33  |   // After click, button becomes busy for 800ms, then view changes
  34  |   // Wait for the input to appear (with generous timeout for production)
  35  |   await page.locator('input').first().waitFor({ state: 'visible', timeout: 20000 });
  36  |   await page.screenshot({ path: 'test-results/deployed-onboard-step1.png' });
  37  |   console.log('✅ Onboarding started');
  38  | 
  39  |   // Step 1: Name
  40  |   await page.locator('input').first().fill('TestUser');
  41  |   await page.locator('button', { hasText: 'Continuar' }).click();
  42  |   await page.waitForTimeout(500);
  43  |   console.log('✅ Step 1: Name');
  44  | 
  45  |   // Step 2: Goal + Duration
  46  |   await page.locator('text=Fuerza y músculo').click();
  47  |   await page.waitForTimeout(200);
  48  |   await page.locator('text=20 min').click();
  49  |   await page.locator('button', { hasText: 'Continuar' }).click();
  50  |   await page.waitForTimeout(500);
  51  |   console.log('✅ Step 2: Goal');
  52  | 
  53  |   // Step 3: Level
  54  |   await page.locator('text=Estoy empezando').click();
  55  |   await page.locator('button', { hasText: 'Continuar' }).click();
  56  |   await page.waitForTimeout(500);
  57  |   console.log('✅ Step 3: Level');
  58  | 
  59  |   // Step 4: Neurotype
  60  |   await page.locator('text=TDAH combinado').click();
  61  |   await page.locator('button', { hasText: 'Continuar' }).click();
  62  |   await page.waitForTimeout(500);
  63  |   console.log('✅ Step 4: Neurotype');
  64  | 
  65  |   // Step 5: Chronotype
  66  |   await page.locator('text=León (mañana)').click();
  67  |   await page.locator('button', { hasText: 'Continuar' }).click();
  68  |   await page.waitForTimeout(500);
  69  |   console.log('✅ Step 5: Chronotype');
  70  | 
  71  |   // Step 6: Equipment + Days
  72  |   await page.locator('text=Sin equipo').click();
  73  |   await page.waitForTimeout(200);
  74  |   await page.locator('text=2-3 días').click();
  75  |   await page.locator('button', { hasText: 'Continuar' }).click();
  76  |   await page.waitForTimeout(500);
  77  |   console.log('✅ Step 6: Equipment');
  78  | 
  79  |   // Step 7: Medication
  80  |   await page.locator('text=No aplica').click();
  81  |   await page.locator('button', { hasText: 'Continuar' }).click();
  82  |   await page.waitForTimeout(500);
  83  |   console.log('✅ Step 7: Medication');
  84  | 
  85  |   // Step 8: Body (skip)
  86  |   await page.locator('button', { hasText: 'Continuar' }).click();
  87  |   await page.waitForTimeout(500);
  88  |   console.log('✅ Step 8: Body (skipped)');
  89  | 
  90  |   // Step 9: Theme
  91  |   await page.locator('text=Iniciación').click();
  92  |   await page.locator('button', { hasText: 'Continuar' }).click();
  93  |   await page.waitForTimeout(500);
  94  |   console.log('✅ Step 9: Theme');
  95  | 
  96  |   // Step 10: Finish
  97  |   await page.locator('button', { hasText: 'Crear mi Digital Twin' }).click();
  98  |   await page.screenshot({ path: 'test-results/deployed-boot.png' });
  99  |   console.log('✅ Step 10: Submitted');
  100 | 
  101 |   // Wait for home screen
  102 |   await page.waitForFunction(
  103 |     () => {
  104 |       const body = document.body.innerText;
  105 |       return body.includes('Buenos') || body.includes('Buenas') || body.includes('Crear rutina');
  106 |     },
  107 |     { timeout: 45000 }
  108 |   );
  109 |   await page.screenshot({ path: 'test-results/deployed-home.png', fullPage: true });
  110 |   console.log('✅ Home screen loaded');
  111 | });
  112 | 
  113 | test('Deployed site: navigation works after onboarding', async ({ page }) => {
  114 |   test.setTimeout(180000);
  115 |   await page.goto(DEPLOYED_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  116 |   await page.waitForTimeout(4000);
  117 | 
  118 |   // Complete onboarding
  119 |   const ctaBtn = page.locator('#cta-btn');
  120 |   await ctaBtn.waitFor({ state: 'visible', timeout: 15000 });
  121 |   await ctaBtn.scrollIntoViewIfNeeded();
  122 |   await page.waitForTimeout(1000);
  123 |   await expect(ctaBtn).not.toHaveAttribute('aria-busy', 'true', { timeout: 5000 });
  124 |   await ctaBtn.click();
> 125 |   await page.locator('input').first().waitFor({ state: 'visible', timeout: 20000 });
      |                                       ^ TimeoutError: locator.waitFor: Timeout 20000ms exceeded.
  126 | 
  127 |   // Complete all onboarding steps
  128 |   await page.locator('input').first().fill('TestUser');
  129 |   await page.locator('button', { hasText: 'Continuar' }).click();
  130 |   await page.waitForTimeout(400);
  131 |   await page.locator('text=Fuerza y músculo').click();
  132 |   await page.waitForTimeout(200);
  133 |   await page.locator('text=20 min').click();
  134 |   await page.locator('button', { hasText: 'Continuar' }).click();
  135 |   await page.waitForTimeout(400);
  136 |   await page.locator('text=Estoy empezando').click();
  137 |   await page.locator('button', { hasText: 'Continuar' }).click();
  138 |   await page.waitForTimeout(400);
  139 |   await page.locator('text=TDAH combinado').click();
  140 |   await page.locator('button', { hasText: 'Continuar' }).click();
  141 |   await page.waitForTimeout(400);
  142 |   await page.locator('text=León (mañana)').click();
  143 |   await page.locator('button', { hasText: 'Continuar' }).click();
  144 |   await page.waitForTimeout(400);
  145 |   await page.locator('text=Sin equipo').click();
  146 |   await page.waitForTimeout(200);
  147 |   await page.locator('text=2-3 días').click();
  148 |   await page.locator('button', { hasText: 'Continuar' }).click();
  149 |   await page.waitForTimeout(400);
  150 |   await page.locator('text=No aplica').click();
  151 |   await page.locator('button', { hasText: 'Continuar' }).click();
  152 |   await page.waitForTimeout(400);
  153 |   await page.locator('button', { hasText: 'Continuar' }).click();
  154 |   await page.waitForTimeout(400);
  155 |   await page.locator('text=Iniciación').click();
  156 |   await page.locator('button', { hasText: 'Continuar' }).click();
  157 |   await page.waitForTimeout(400);
  158 |   await page.locator('button', { hasText: 'Crear mi Digital Twin' }).click();
  159 | 
  160 |   // Wait for home screen
  161 |   await page.waitForFunction(
  162 |     () => {
  163 |       const body = document.body.innerText;
  164 |       return body.includes('Buenos') || body.includes('Buenas') || body.includes('Crear rutina');
  165 |     },
  166 |     { timeout: 45000 }
  167 |   );
  168 |   console.log('✅ Onboarding completed, home loaded');
  169 | 
  170 |   // Take screenshot of home screen to see what's there
  171 |   await page.screenshot({ path: 'test-results/deployed-home-debug.png', fullPage: true });
  172 |   console.log('✅ Home screen captured');
  173 | 
  174 |   // Check for navbar or navigation elements
  175 |   const navVisible = await page.locator('nav').first().isVisible({ timeout: 5000 }).catch(() => false);
  176 |   console.log(`Nav visible: ${navVisible}`);
  177 | 
  178 |   // Try to find any navigation buttons
  179 |   const buttons = await page.locator('button').allTextContents();
  180 |   console.log('Buttons found:', buttons.slice(0, 10).join(', '));
  181 | 
  182 |   // Test navigation to Entrenar (main CTA on home)
  183 |   const entrenarBtn = page.locator('button').filter({ hasText: 'Entrenar' }).first();
  184 |   if (await entrenarBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  185 |     await entrenarBtn.click();
  186 |     await page.waitForTimeout(800);
  187 |     await page.screenshot({ path: 'test-results/deployed-nav-entrenar.png', fullPage: true });
  188 |     console.log('✅ Navigated to Entrenar');
  189 |   }
  190 | 
  191 |   // Navigate back to Inicio
  192 |   const inicioBtn = page.locator('button').filter({ hasText: 'Inicio' }).first();
  193 |   if (await inicioBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  194 |     await inicioBtn.click();
  195 |     await page.waitForTimeout(800);
  196 |     console.log('✅ Navigated back to Inicio');
  197 |   }
  198 | 
  199 |   // Test navigation to Coach
  200 |   const coachBtn = page.locator('button').filter({ hasText: 'Coach' }).first();
  201 |   if (await coachBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  202 |     await coachBtn.click();
  203 |     await page.waitForTimeout(800);
  204 |     await page.screenshot({ path: 'test-results/deployed-nav-coach.png', fullPage: true });
  205 |     console.log('✅ Navigated to Coach');
  206 |   }
  207 | 
  208 |   // Navigate back to Inicio
  209 |   const inicioBtn2 = page.locator('button').filter({ hasText: 'Inicio' }).first();
  210 |   if (await inicioBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
  211 |     await inicioBtn2.click();
  212 |     await page.waitForTimeout(800);
  213 |     console.log('✅ Navigated back to Inicio from Coach');
  214 |   }
  215 | 
  216 |   // Test navigation to Sistema
  217 |   const sistemaBtn = page.locator('button').filter({ hasText: 'Sistema' }).first();
  218 |   if (await sistemaBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
  219 |     await sistemaBtn.click();
  220 |     await page.waitForTimeout(800);
  221 |     await page.screenshot({ path: 'test-results/deployed-nav-sistema.png', fullPage: true });
  222 |     console.log('✅ Navigated to Sistema');
  223 |   }
  224 | 
  225 |   console.log('✅ All navigation tests completed');
```