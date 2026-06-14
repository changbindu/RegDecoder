import { describe, it, expect } from 'vitest';
import { parseValue, formatHex, formatBinary } from '../formatter/index.js';

describe('parseValue', () => {
  it('parses hex values', () => {
    expect(parseValue('0x1234_5678')).toBe(0x12345678n);
    expect(parseValue('0xFF')).toBe(255n);
    expect(parseValue('0xDEAD_BEEF')).toBe(0xDEADBEEFn);
  });

  it('parses binary values', () => {
    expect(parseValue('0b1010')).toBe(10n);
    expect(parseValue('0b1111_0000')).toBe(240n);
    expect(parseValue('0B0101')).toBe(5n);
  });

  it('parses decimal values', () => {
    expect(parseValue('255')).toBe(255n);
    expect(parseValue('0')).toBe(0n);
    expect(parseValue('123456789')).toBe(123456789n);
  });

  it('strips spaces', () => {
    expect(parseValue('0x dead beef')).toBe(0xDEADBEEFn);
    expect(parseValue('0b 1010 1111')).toBe(175n);
    expect(parseValue('  123  ')).toBe(123n);
  });

  it('strips underscores', () => {
    expect(parseValue('0x1234_5678')).toBe(0x12345678n);
    expect(parseValue('0b1111_0000')).toBe(240n);
  });

  it('rejects empty input', () => {
    expect(() => parseValue('')).toThrow();
    expect(() => parseValue('   ')).toThrow();
    expect(() => parseValue('_')).toThrow();
  });

  it('rejects 0x without digits', () => {
    expect(() => parseValue('0x')).toThrow();
    expect(() => parseValue('0X')).toThrow();
  });

  it('rejects 0b without digits', () => {
    expect(() => parseValue('0b')).toThrow();
    expect(() => parseValue('0B')).toThrow();
  });

  it('rejects negative values', () => {
    expect(() => parseValue('-1')).toThrow();
    expect(() => parseValue('-0xFF')).toThrow();
  });

  it('rejects invalid characters', () => {
    expect(() => parseValue('hello')).toThrow();
    expect(() => parseValue('0xGGGG')).toThrow();
    expect(() => parseValue('0b012')).toThrow();
  });

  it('handles large 64-bit values', () => {
    expect(parseValue('0xFFFFFFFFFFFFFFFF')).toBe(0xFFFFFFFFFFFFFFFFn);
    expect(parseValue('18446744073709551615')).toBe(0xFFFFFFFFFFFFFFFFn);
  });
});

describe('formatHex', () => {
  it('pads to register width', () => {
    expect(formatHex(1n, 32)).toBe('0x00000001');
    expect(formatHex(255n, 32)).toBe('0x000000ff');
  });

  it('handles 64-bit', () => {
    expect(formatHex(0xFFFFFFFFFFFFFFFFn, 64)).toBe('0xffffffffffffffff');
    expect(formatHex(0n, 64)).toBe('0x0000000000000000');
  });

  it('handles 8-bit', () => {
    expect(formatHex(15n, 8)).toBe('0x0f');
    expect(formatHex(0n, 8)).toBe('0x00');
  });

  it('pads to default if width 0', () => {
    // ceil(0/4) = 0, so no padding
    expect(formatHex(0n, 1)).toBe('0x0');
  });
});

describe('formatBinary', () => {
  it('pads to width', () => {
    expect(formatBinary(5n, 8)).toBe('0b00000101');
    expect(formatBinary(0n, 4)).toBe('0b0000');
    expect(formatBinary(15n, 4)).toBe('0b1111');
  });

  it('handles 32-bit', () => {
    expect(formatBinary(1n, 32)).toBe('0b00000000000000000000000000000001');
  });

  it('handles zero', () => {
    expect(formatBinary(0n, 8)).toBe('0b00000000');
  });
});
