import { parse as parseJsonc } from 'jsonc-parser';
import type { Register, Field, TreeNode, RegisterDefinition } from '../types.js';

// Valid register widths
const VALID_WIDTHS = new Set([8, 16, 32, 64]);

/**
 * Parse a JSONC string into a validated Register object.
 * Throws with descriptive error messages on validation failure.
 */
export function parseRegister(jsoncString: string): Register {
  let parsed: unknown;
  try {
    parsed = parseJsonc(jsoncString);
  } catch (e) {
    throw new Error(
      'Failed to parse JSONC: ' + (e instanceof Error ? e.message : String(e))
    );
  }
  
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('JSONC root must be an object');
  }
  
  const root = parsed as Record<string, unknown>;
  const regRaw = root['register'];
  
  if (typeof regRaw !== 'object' || regRaw === null) {
    throw new Error('Missing or invalid "register" key in definition');
  }
  
  const reg = regRaw as Record<string, unknown>;
  
  // Validate name
  const name = reg['name'];
  if (typeof name !== 'string' || name.length === 0) {
    throw new Error('Register "name" must be a non-empty string');
  }
  
  // Validate width
  const width = reg['width'];
  if (typeof width !== 'number' || !VALID_WIDTHS.has(width)) {
    throw new Error(
      `Invalid register width '${width}'. Must be one of: 8, 16, 32, 64.`
    );
  }
  
  // Validate fields
  const fieldsRaw = reg['fields'];
  if (!Array.isArray(fieldsRaw)) {
    throw new Error('Register "fields" must be an array');
  }
  
  const fields: Field[] = fieldsRaw.map((f: unknown, idx: number) => {
    if (typeof f !== 'object' || f === null) {
      throw new Error(`Field at index ${idx} must be an object`);
    }
    const field = f as Record<string, unknown>;
    
    const fName = field['name'];
    if (typeof fName !== 'string' || fName.length === 0) {
      throw new Error(`Field at index ${idx}: "name" must be a non-empty string`);
    }
    
    const bits = field['bits'];
    if (typeof bits !== 'string' || bits.length === 0) {
      throw new Error(`Field "${fName}": "bits" must be a non-empty string`);
    }
    
    // Validate bits format: digits, hyphens, commas, spaces
    if (!/^[\d\-,\s]+$/.test(bits)) {
      throw new Error(
        `Field "${fName}": "bits" contains invalid characters. Expected digits, hyphens, commas, spaces.`
      );
    }
    
    // Parse bit positions and validate range
    const positions = parseBitPositions(bits);
    for (const pos of positions) {
      if (pos >= width) {
        throw new Error(
          `Field "${fName}": bit position ${pos} exceeds register width ${width}`
        );
      }
      if (pos < 0) {
        throw new Error(
          `Field "${fName}": invalid negative bit position`
        );
      }
    }
    
    const description = field['description'];
    if (typeof description !== 'string') {
      throw new Error(`Field "${fName}": "description" must be a string`);
    }
    
    let enums = undefined;
    if (field['enums'] !== undefined) {
      if (!Array.isArray(field['enums'])) {
        throw new Error(`Field "${fName}": "enums" must be an array`);
      }
      enums = field['enums'].map((e: unknown, ei: number) => {
        if (typeof e !== 'object' || e === null) {
          throw new Error(
            `Field "${fName}" enum at index ${ei}: must be an object`
          );
        }
        return e as Record<string, string>;
      });
    }
    
    return {
      name: fName,
      bits: bits,
      description: description,
      enums,
    };
  });
  
  return { name, width: width as Register['width'], fields };
}

/**
 * Parse a bits string like "0, 7-9" into a sorted (descending) array of all
 * referenced bit positions.
 */
export function parseBitPositions(bitsStr: string): number[] {
  const positions: number[] = [];
  const tokens = bitsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
  
  for (const token of tokens) {
    if (token.includes('-')) {
      const [startStr, endStr] = token.split('-').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      
      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Invalid bit range: "${token}"`);
      }
      
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      for (let i = lo; i <= hi; i++) {
        positions.push(i);
      }
    } else {
      const pos = parseInt(token, 10);
      if (isNaN(pos)) {
        throw new Error(`Invalid bit position: "${token}"`);
      }
      positions.push(pos);
    }
  }
  
  // Sort descending (high-to-low) per spec section 3.2
  positions.sort((a, b) => b - a);
  
  // Remove duplicates (if any)
  return [...new Set(positions)];
}

/**
 * Build a directory tree from a map of file paths to content.
 * Input is typically from import.meta.glob with { as: 'raw', eager: true }.
 * Path example: "arm/system/sctlr_el1.jsonc"
 */
export function buildTree(
  definitions: Record<string, string>
): TreeNode[] {
  // Remove leading slash from glob paths if present
  const root: TreeNode[] = [];
  
  for (const [rawPath] of Object.entries(definitions)) {
    // Normalize path: remove leading . or /, keep only the logical path
    const path = rawPath.replace(/^(?:\.\.\/|\.\/)+/, '').replace(/^\/+/, '').replace(/^definitions\//, '').replace(/\.jsonc$/, '');
    const parts = path.split('/');
    
    let currentLevel = root;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const nodePath = parts.slice(0, i + 1).join('/');
      
      let existing = currentLevel.find(n => n.name === part);
      
      if (!existing) {
        existing = {
          name: part,
          path: nodePath,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : [],
        };
        currentLevel.push(existing);
      }
      
      if (!isFile && existing.children) {
        currentLevel = existing.children;
      }
    }
  }
  
  return root;
}
