// RegDecoder Core Types

/** Enum entry: key is the numeric value (as string), value is the meaning */
export type EnumEntry = Record<string, string>;

/** A single bit-field definition from JSONC */
export interface Field {
  name: string;
  bits: string;         // e.g. "0, 7-9"
  description: string;
  enums?: EnumEntry[];
}

/** The register definition from JSONC */
export interface Register {
  name: string;
  width: 8 | 16 | 32 | 64;
  fields: Field[];
}

/** Root shape of a JSONC register definition file */
export interface RegisterDefinition {
  register: Register;
}

/** A decoded field with extracted value and formatting */
export interface DecodedField {
  name: string;
  bits: string;          // original bits string
  bitPositions: number[]; // sorted descending
  rawValue: bigint;
  hex: string;
  binary: string;
  description: string;
  enumMatch?: string;    // matched enum meaning, or undefined
  isReserved: boolean;
}

/** Result of decoding a register value */
export interface DecodeResult {
  registerName: string;
  width: number;
  inputValue: bigint;
  truncatedValue: bigint;
  isTruncated: boolean;
  fields: DecodedField[];
}

/** A node in the register definition directory tree */
export interface TreeNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: TreeNode[];
}

/** Result of encoding (single-bit XOR) */
export interface EncodeResult {
  newValue: bigint;
  hex: string;
  binary: string;
}
