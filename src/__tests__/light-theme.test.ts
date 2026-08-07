import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const CSS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
const PAGE = readFileSync(join(process.cwd(), 'src/app/page.tsx'), 'utf8');

describe('Light theme · foundation (Fase 5, dark-first)', () => {
  it('globals.css define variables claras bajo body.light', () => {
    const block = CSS.split('body.light {')[1].split('}')[0];
    expect(block).toBeTruthy();
    expect(block).toContain('--bg: #f2f5fc');
    expect(block).toContain('--text: #0f1424');
    expect(block).toContain('--muted: #5a6373');
  });

  it('page.tsx persiste prefs.light en el body class', () => {
    expect(PAGE).toContain("classList.toggle('light', prefs.light");
  });

  it('profile expone el toggle Tema claro', () => {
    const profile = readFileSync(join(process.cwd(), 'src/components/profile/profile-screen.tsx'), 'utf8');
    expect(profile).toContain("'light'");
    expect(profile).toContain('Tema claro');
  });
});
