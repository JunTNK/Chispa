import { describe, it, expect } from 'vitest';
import { MotivationEngine } from '@/lib/agents/motivation-engine';

describe('locale visual check (dev only)', () => {
  it('energy-good ES vs EN at recovery 75', () => {
    const es = MotivationEngine.message('energy', 75, 65, 20, 'es');
    const en = MotivationEngine.message('energy', 75, 65, 20, 'en');
    console.log('\nES:', es);
    console.log('EN:', en);
    expect(es).toContain('75%');
    expect(en).toContain('75%');
    expect(es).toContain('chispa');
    expect(en).toContain('spark');
  });

  it('restMessage ES vs EN for energy twin', () => {
    const esR = MotivationEngine.restMessage('energy', 'es');
    const enR = MotivationEngine.restMessage('energy', 'en');
    console.log('\nREST ES:', esR);
    console.log('REST EN:', enR);
    expect(esR.length).toBeGreaterThan(0);
    expect(enR.length).toBeGreaterThan(0);
  });
});
