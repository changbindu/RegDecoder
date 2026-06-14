import { describe, it, expect } from 'vitest';
import { encode } from '../encoder/index.js';

describe('encode', () => {
  it('flips bit 0 from 0 to 1', () => {
    const r = encode(0n, 0);
    expect(r.newValue).toBe(1n);
  });

  it('flips bit 0 from 1 to 0', () => {
    const r = encode(1n, 0);
    expect(r.newValue).toBe(0n);
  });

  it('flips bit in the middle', () => {
    const r = encode(0x0Fn, 3);
    // 0xF = 0b1111, flip bit 3 -> 0b0111 = 7
    expect(r.newValue).toBe(7n);
  });

  it('flips MSB of 64-bit', () => {
    const r = encode(0n, 63);
    expect(r.newValue).toBe(1n << 63n);
  });

  it('includes formatted hex and binary', () => {
    const r = encode(0n, 0);
    expect(r.hex).toMatch(/^0x/);
    expect(r.binary).toMatch(/^0b/);
  });
});
