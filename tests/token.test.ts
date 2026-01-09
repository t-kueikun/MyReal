import { describe, expect, it } from 'vitest';
import { createToken, verifyToken } from '../lib/token';

describe('token', () => {
  it('creates and verifies token', () => {
    const { token } = createToken(1);
    const result = verifyToken(token);
    expect(result.valid).toBe(true);
  });

  it('rejects expired token', () => {
    const { token } = createToken(-1);
    const result = verifyToken(token);
    expect(result.valid).toBe(false);
  });
});
