import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const CSS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
const PAGE = readFileSync(join(process.cwd(), 'src/app/page.tsx'), 'utf8');

describe('High Contrast · HC real y persistente (Fase 4a)', () => {
  it('globals.css define variables elevadas bajo body.hc', () => {
    const hcBlock = CSS.split('body.hc {')[1].split('}')[0];
    expect(hcBlock).toBeTruthy();
    expect(hcBlock).toContain('--muted');
    expect(hcBlock).toContain('--card');
  });

  it('page.tsx persiste prefs.highContrast en el body class', () => {
    expect(PAGE).toContain("classList.toggle('hc', prefs.highContrast)");
  });

  it('HC auto-activa bajo prefers-contrast: more', () => {
    expect(PAGE).toContain("(prefers-contrast: more)");
  });
});
