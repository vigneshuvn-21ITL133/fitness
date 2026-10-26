import { describe, expect, test } from 'bun:test';

import { startSession, pauseSession } from './activity';
import {
  currentSession,
  deleteSession,
  initialActivityState,
  recoverInState,
  sanitizeActivityState,
  sessionsNewestFirst,
  unfinishedSessions,
  upsertSession,
} from './activityState';

describe('activity state', () => {
  test('only one running or paused session is current', () => {
    let state = initialActivityState();
    state = upsertSession(state, startSession('a', 0, false));
    expect(currentSession(state)?.id).toBe('a');
    expect(unfinishedSessions(state)).toHaveLength(1);
  });

  test('sessions are listed newest first', () => {
    let state = initialActivityState();
    state = upsertSession(state, startSession('old', 1000, false));
    state = upsertSession(state, startSession('new', 5000, false));
    expect(sessionsNewestFirst(state).map((s) => s.id)).toEqual(['new', 'old']);
  });

  test('upsert replaces an existing session by id', () => {
    let state = upsertSession(initialActivityState(), startSession('a', 0, false));
    state = upsertSession(state, pauseSession(startSession('a', 0, false), 1000, 3));
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0].status).toBe('paused');
  });

  test('delete removes only that session', () => {
    let state = upsertSession(initialActivityState(), startSession('a', 0, false));
    state = upsertSession(state, startSession('b', 0, false));
    expect(deleteSession(state, 'a').sessions.map((s) => s.id)).toEqual(['b']);
  });

  test('recoverInState marks an unfinished session as interrupted', () => {
    let state = upsertSession(initialActivityState(), startSession('a', 0, false));
    state = recoverInState(state, 'a', 12);
    expect(state.sessions[0].status).toBe('interrupted');
    expect(state.sessions[0].steps).toBe(12);
  });
});

describe('sanitizeActivityState', () => {
  test('returns an empty state for non-object data', () => {
    expect(sanitizeActivityState(null)).toEqual(initialActivityState());
    expect(sanitizeActivityState({ sessions: 'nope' })).toEqual(initialActivityState());
  });

  test('drops malformed sessions and keeps valid ones', () => {
    const valid = startSession('ok', 1000, false);
    const state = sanitizeActivityState({
      version: 1,
      sessions: [valid, { id: 42, startedAt: 1, status: 'active' }, { id: 'x', startedAt: 1, status: 'weird' }],
    });
    expect(state.sessions.map((s) => s.id)).toEqual(['ok']);
  });

  test('drops malformed route points and clamps negative numbers', () => {
    const state = sanitizeActivityState({
      version: 1,
      sessions: [
        {
          id: 'a',
          startedAt: 1000,
          status: 'completed',
          activeMs: -50,
          steps: -3,
          distanceM: -10,
          route: [
            { lat: 1, lng: 2, t: 1000, acc: 5 },
            { lat: 'x', lng: 2, t: 1000, acc: 5 },
            null,
          ],
        },
      ],
    });
    const [s] = state.sessions;
    expect(s.route).toHaveLength(1);
    expect(s.activeMs).toBe(0);
    expect(s.steps).toBe(0);
    expect(s.distanceM).toBe(0);
    expect(s.gps).toBe(false);
    expect(s.kcal).toBeNull();
  });
});
