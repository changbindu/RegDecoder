import type { EncodeResult } from '../types.js';
import { formatHex, formatBinary } from '../formatter/index.js';

/**
 * Flip a single bit via XOR. Returns the new register value with
 * formatted hex and binary representations.
 */
export function encode(value: bigint, bitIndex: number): EncodeResult {
  const mask = 1n << BigInt(bitIndex);
  const newValue = value ^ mask;
  
  // Encode result uses 64-bit formatting for consistency
  return {
    newValue,
    hex: formatHex(newValue, 64),
    binary: formatBinary(newValue, 64),
  };
}
