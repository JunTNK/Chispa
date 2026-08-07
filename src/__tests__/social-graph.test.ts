import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/lib/store';

describe('Store · social graph coopMode (Fase 7)', () => {
  beforeEach(() => {
    useStore.setState({
      friends: [],
      myInviteCode: null,
      coopMode: 'none',
    });
  });

  it('generateInviteCode crea un código de 6 dígitos con expiración 48h', () => {
    const code = useStore.getState().generateInviteCode();
    expect(code).toMatch(/^\d{6}$/);
    const invite = useStore.getState().myInviteCode;
    expect(invite?.code).toBe(code);
    const remaining = new Date(invite!.expires_at).getTime() - Date.now();
    expect(remaining).toBeCloseTo(48 * 3600_000, -1000);
  });

  it('addFriend acepta código válido y rechaza códigos malformados/repetidos', () => {
    useStore.getState().generateInviteCode();
    expect(useStore.getState().addFriend('123456')).toBe(true);
    expect(useStore.getState().friends).toHaveLength(1);
    expect(useStore.getState().friends[0].id).toBe('123456');

    // código malformado
    expect(useStore.getState().addFriend('abc')).toBe(false);
    expect(useStore.getState().friends).toHaveLength(1);
    // código repetido
    expect(useStore.getState().addFriend('123456')).toBe(false);
  });
});
