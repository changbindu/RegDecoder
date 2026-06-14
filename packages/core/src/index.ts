export type {
  EnumEntry,
  Field,
  Register,
  RegisterDefinition,
  DecodedField,
  DecodeResult,
  TreeNode,
  EncodeResult,
} from './types.js';

export { parseRegister, buildTree, parseBitPositions } from './parser/index.js';
export { parseValue, formatHex, formatBinary } from './formatter/index.js';
export { decode } from './decoder/index.js';
export { encode } from './encoder/index.js';
