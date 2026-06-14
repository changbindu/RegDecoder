import type { Register, DecodedField, DecodeResult, EnumEntry } from '../types.js';
import { formatHex, formatBinary } from '../formatter/index.js';
import { parseBitPositions } from '../parser/index.js';

/**
 * Decode a register value into its constituent bit fields.
 * Handles truncation, bit extraction (including discontinuous fields),
 * enum lookup, and reserved bit detection.
 */
export function decode(register: Register, value: bigint): DecodeResult {
  const { name, width, fields } = register;
  
  // Step 1: Truncation
  const mask = (1n << BigInt(width)) - 1n;
  const truncatedValue = value & mask;
  const isTruncated = value > mask;
  
  // Step 2: Build a set of all claimed bit positions
  const claimedBits = new Set<number>();
  for (const field of fields) {
    const positions = parseBitPositions(field.bits);
    for (const pos of positions) {
      claimedBits.add(pos);
    }
  }
  
  // Step 3: Decode each declared field
  const decodedFields: DecodedField[] = [];
  
  for (const field of fields) {
    const positions = parseBitPositions(field.bits);
    
    // Extract field value: bits are already sorted descending by parseBitPositions
    // Build the field value MSB-first: for each position (high to low),
    // extract the bit and shift it into the result
    let fieldValue = 0n;
    for (const pos of positions) {
      const bit = (truncatedValue >> BigInt(pos)) & 1n;
      fieldValue = (fieldValue << 1n) | bit;
    }
    
    // Format display strings
    // Field hex: pad to ceil(nBits/4) for the field width
    const fieldBits = positions.length;
    const hex = formatHex(fieldValue, fieldBits);
    const binary = formatBinary(fieldValue, fieldBits);
    
    // Enum lookup
    let enumMatch: string | undefined = undefined;
    if (field.enums) {
      const valueStr = fieldValue.toString();
      for (const entry of field.enums) {
        // Each entry is { "key": "meaning" }
        if (valueStr in entry) {
          enumMatch = entry[valueStr];
          break;
        }
      }
    }
    
    // Build bits display string
    const bitsDisplay = formatBitsRange(positions);
    
    decodedFields.push({
      name: field.name,
      bits: bitsDisplay,
      bitPositions: positions,
      rawValue: fieldValue,
      hex,
      binary,
      description: field.description,
      enumMatch,
      isReserved: false,
    });
  }
  
  // Step 4: Detect reserved bits
  const allBits = new Set<number>();
  for (let i = 0; i < width; i++) {
    allBits.add(i);
  }
  
  const reservedPositions: number[] = [];
  for (const bit of allBits) {
    if (!claimedBits.has(bit)) {
      reservedPositions.push(bit);
    }
  }
  
  if (reservedPositions.length > 0) {
    // Sort descending (same convention)
    reservedPositions.sort((a, b) => b - a);
    
    // Extract value from reserved bits (same MSB-first logic)
    let reservedValue = 0n;
    for (const pos of reservedPositions) {
      const bit = (truncatedValue >> BigInt(pos)) & 1n;
      reservedValue = (reservedValue << 1n) | bit;
    }
    
    decodedFields.push({
      name: 'Reserved',
      bits: formatBitsRange(reservedPositions),
      bitPositions: reservedPositions,
      rawValue: reservedValue,
      hex: formatHex(reservedValue, reservedPositions.length),
      binary: formatBinary(reservedValue, reservedPositions.length),
      description: '-',
      enumMatch: undefined,
      isReserved: true,
    });
  }
  
  // Step 5: Sort fields by highest bit position (descending)
  decodedFields.sort((a, b) => {
    const aMax = a.bitPositions.length > 0 ? a.bitPositions[0] : 0;
    const bMax = b.bitPositions.length > 0 ? b.bitPositions[0] : 0;
    return bMax - aMax;
  });
  
  return {
    registerName: name,
    width,
    inputValue: value,
    truncatedValue,
    isTruncated,
    fields: decodedFields,
  };
}

/**
 * Format an array of sorted (descending) bit positions into a human-readable
 * range string, e.g., [9,8,7,0] -> "9-7, 0" or [0] -> "0".
 */
function formatBitsRange(positions: number[]): string {
  if (positions.length === 0) return '';
  
  const sorted = [...positions].sort((a, b) => b - a);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    // Check if consecutive (descending: prev - 1 === current)
    if (prev - 1 === current) {
      prev = current;
    } else {
      // End the current range
      if (start === prev) {
        ranges.push(String(start));
      } else {
        ranges.push(start + '-' + prev);
      }
      start = current;
      prev = current;
    }
  }
  
  // Last range
  if (start === prev) {
    ranges.push(String(start));
  } else {
    ranges.push(start + '-' + prev);
  }
  
  return ranges.join(', ');
}
