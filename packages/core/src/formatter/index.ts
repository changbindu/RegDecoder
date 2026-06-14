// Formatter module: input cleaning, base conversion, display formatting

/**
 * Strip spaces and underscores, detect base prefix (0x/0b/decimal),
 * parse to BigInt. Throws on empty, negative, or invalid input.
 */
export function parseValue(input: string): bigint {
  // Strip all whitespace and underscores
  const cleaned = input.replace(/[\s_]/g, '');
  
  if (cleaned.length === 0) {
    throw new Error('Empty input');
  }
  
  // Detect and validate prefix
  if (cleaned.startsWith('0x') || cleaned.startsWith('0X')) {
    const hexPart = cleaned.slice(2);
    if (hexPart.length === 0) {
      throw new Error('Missing hex digits after 0x prefix');
    }
    if (!/^[0-9a-fA-F]+$/.test(hexPart)) {
      throw new Error(`Invalid hex digits: ${hexPart}`);
    }
    return BigInt('0x' + hexPart);
  }
  
  if (cleaned.startsWith('0b') || cleaned.startsWith('0B')) {
    const binPart = cleaned.slice(2);
    if (binPart.length === 0) {
      throw new Error('Missing binary digits after 0b prefix');
    }
    if (!/^[01]+$/.test(binPart)) {
      throw new Error(`Invalid binary digits: ${binPart}`);
    }
    return BigInt('0b' + binPart);
  }
  
  // Decimal (no prefix) — must be all digits
  if (/^-/.test(cleaned)) {
    throw new Error('Negative values are not supported');
  }
  if (!/^[0-9]+$/.test(cleaned)) {
    throw new Error(`Invalid decimal input: ${cleaned}`);
  }
  
  return BigInt(cleaned);
}

/**
 * Format a BigInt as zero-padded hexadecimal string.
 * Pads to ceil(width/4) hex digits.
 */
export function formatHex(value: bigint, width: number): string {
  const hexDigits = Math.ceil(width / 4);
  const hex = value.toString(16);
  const padded = hex.padStart(hexDigits, '0');
  return '0x' + padded;
}

/**
 * Format a BigInt as zero-padded binary string.
 * Pads to `width` bits.
 */
export function formatBinary(value: bigint, width: number): string {
  const bin = value.toString(2);
  const padded = bin.padStart(width, '0');
  return '0b' + padded;
}
