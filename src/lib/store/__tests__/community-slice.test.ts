import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '@/lib/store';
import type { Workout, QuickLogEntry } from '@/types';

describe('Community Slice (feed cooperativo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.getState().reset();
  });

  it('default: communityPosts vacío y coopMode none', () => {
    const { communityPosts, coopMode } = useStore.getState();
    expect(communityPosts).toEqual([]);
    expect(coopMode).toBe('none');
  });

  it('addWorkout con coopMode none → NO crea chispa', () => {
    useStore.getState().addWorkout(fakeWorkout());
    expect(useStore.getState().communityPosts).toHaveLength(0);
  });

  it('addWorkout con coopMode friends → crea chispa tipo workout', () => {
    useStore.getState().setCoopMode('friends');
    useStore.getState().addWorkout(fakeWorkout());
    const posts = useStore.getState().communityPosts;
    expect(posts).toHaveLength(1);
    expect(posts[0].kind).toBe('workout');
    expect(posts[0].focus).toBe('full');
    expect(posts[0].author_id).toBe(''); // '' = yo
    expect(posts[0].reactions).toBe(0);
  });

  it('addQuickLog con coopMode public → crea chispa tipo quicklog', () => {
    useStore.getState().setCoopMode('public');
    useStore.getState().addQuickLog(fakeQuickLog());
    const posts = useStore.getState().communityPosts;
    expect(posts).toHaveLength(1);
    expect(posts[0].kind).toBe('quicklog');
    expect(posts[0].durationMin).toBe(15);
  });

  it('reactToPost: el aplauso suma y resta (toggle)', () => {
    useStore.getState().setCoopMode('friends');
    useStore.getState().addWorkout(fakeWorkout());
    const id = useStore.getState().communityPosts[0].id;

    useStore.getState().reactToPost(id);
    let p = useStore.getState().communityPosts[0];
    expect(p.myReacted).toBe(true);
    expect(p.reactions).toBe(1);

    useStore.getState().reactToPost(id);
    p = useStore.getState().communityPosts[0];
    expect(p.myReacted).toBe(false);
    expect(p.reactions).toBe(0);
  });

  it('addCommunityPost: añade un post arbitrario y persiste en partialize', () => {
    const post = {
      id: crypto.randomUUID(),
      author_id: '',
      kind: 'quicklog' as const,
      durationMin: 10,
      created_at: new Date().toISOString(),
      reactions: 0,
      myReacted: false,
    };
    useStore.getState().addCommunityPost(post);
    expect(useStore.getState().communityPosts).toHaveLength(1);
    expect(useStore.getState().communityPosts[0].id).toBe(post.id);
  });

  it('los ids de las chispas son uuid puros (compatibles con la columna uuid del sync)', () => {
    useStore.getState().setCoopMode('friends');
    useStore.getState().addWorkout(fakeWorkout());
    const id = useStore.getState().communityPosts[0].id;
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});

function fakeWorkout(): Workout {
  return {
    id: 'w-1',
    user_id: '',
    date: '2026-08-12',
    duration: 20,
    focus: 'full',
    intensity: 'standard',
    score: 80,
    completed_rate: 1,
    exercises: [],
    actual_minutes: 18,
    created_at: new Date().toISOString(),
  };
}

function fakeQuickLog(): QuickLogEntry {
  return {
    id: 'q-1',
    user_id: '',
    date: '2026-08-12',
    duration: 15,
    exercises: [{ name: 'Sentadilla' }],
    created_at: new Date().toISOString(),
  };
}
