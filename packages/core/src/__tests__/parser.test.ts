import { describe, it, expect } from 'vitest';
import { parseRegister, buildTree, parseBitPositions } from '../parser/index.js';

describe('parseRegister', () => {
  it('parses valid register with empty fields', () => {
    const r = parseRegister('{"register":{"name":"TEST","width":32,"fields":[]}}');
    expect(r.name).toBe('TEST');
    expect(r.width).toBe(32);
    expect(r.fields).toHaveLength(0);
  });

  it('parses register with single field', () => {
    const r = parseRegister('{"register":{"name":"X","width":8,"fields":[{"name":"F","bits":"0","description":"d"}]}}');
    expect(r.fields).toHaveLength(1);
    expect(r.fields[0].name).toBe('F');
    expect(r.fields[0].bits).toBe('0');
  });

  it('parses field with enums', () => {
    const r = parseRegister('{"register":{"name":"Y","width":32,"fields":[{"name":"M","bits":"0","description":"Mode","enums":[{"0":"off"},{"1":"on"}]}]}}');
    expect(r.fields[0].enums).toHaveLength(2);
    expect(r.fields[0].enums![0]).toEqual({'0': 'off'});
  });

  it('rejects width 7', () => {
    expect(() => parseRegister('{"register":{"name":"X","width":7,"fields":[]}}')).toThrow(/width/);
  });

  it('rejects width 0', () => {
    expect(() => parseRegister('{"register":{"name":"X","width":0,"fields":[]}}')).toThrow(/width/);
  });

  it('rejects width 128', () => {
    expect(() => parseRegister('{"register":{"name":"X","width":128,"fields":[]}}')).toThrow(/width/);
  });

  it('rejects bit position >= width', () => {
    expect(() => parseRegister('{"register":{"name":"X","width":8,"fields":[{"name":"F","bits":"8","description":"d"}]}}')).toThrow(/exceeds/);
  });

  it('rejects missing register key', () => {
    expect(() => parseRegister('{"something": "else"}')).toThrow(/register/);
  });

  it('rejects non-string name', () => {
    expect(() => parseRegister('{"register":{"name":123,"width":32,"fields":[]}}')).toThrow(/name/);
  });

  it('rejects invalid bits characters', () => {
    expect(() => parseRegister('{"register":{"name":"X","width":32,"fields":[{"name":"F","bits":"abc","description":"d"}]}}')).toThrow(/invalid characters/);
  });

  it('rejects fields that is not an array', () => {
    expect(() => parseRegister('{"register":{"name":"X","width":32,"fields":"not_array"}}')).toThrow(/fields/);
  });

  it('accepts all valid widths', () => {
    expect(parseRegister('{"register":{"name":"A","width":8,"fields":[]}}').width).toBe(8);
    expect(parseRegister('{"register":{"name":"B","width":16,"fields":[]}}').width).toBe(16);
    expect(parseRegister('{"register":{"name":"C","width":32,"fields":[]}}').width).toBe(32);
    expect(parseRegister('{"register":{"name":"D","width":64,"fields":[]}}').width).toBe(64);
  });
});

describe('parseBitPositions', () => {
  it('parses single bit', () => {
    expect(parseBitPositions('0')).toEqual([0]);
  });

  it('parses bit range', () => {
    expect(parseBitPositions('7-9')).toEqual([9, 8, 7]);
  });

  it('parses discontinuous bits', () => {
    expect(parseBitPositions('0, 7-9')).toEqual([9, 8, 7, 0]);
  });

  it('parses multiple ranges', () => {
    expect(parseBitPositions('0-3, 8-11')).toEqual([11, 10, 9, 8, 3, 2, 1, 0]);
  });

  it('handles reversed ranges', () => {
    expect(parseBitPositions('9-7')).toEqual([9, 8, 7]);
  });

  it('removes duplicates', () => {
    expect(parseBitPositions('0, 0-2, 1')).toEqual([2, 1, 0]);
  });
});

describe('buildTree', () => {
  it('builds tree from single file', () => {
    const defs = { 'arm/aarch64/system/sctlr.jsonc': '...' };
    const tree = buildTree(defs);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('arm');
    expect(tree[0].type).toBe('directory');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].name).toBe('aarch64');
    expect(tree[0].children![0].children![0].name).toBe('system');
    expect(tree[0].children![0].children![0].children![0].name).toBe('sctlr');
    expect(tree[0].children![0].children![0].children![0].type).toBe('file');
  });

  it('returns empty for empty input', () => {
    expect(buildTree({})).toEqual([]);
  });

  it('handles multiple files in same directory', () => {
    const defs = {
      'arm/aarch64/system/sctlr.jsonc': '...',
      'arm/aarch64/system/tcr.jsonc': '...',
    };
    const tree = buildTree(defs);
    const files = tree[0].children![0].children![0].children!;
    expect(files).toHaveLength(2);
    expect(files.map(f => f.name)).toContain('sctlr');
    expect(files.map(f => f.name)).toContain('tcr');
  });

  it('removes leading dot prefix from glob paths', () => {
    const defs = { './arm/aarch64/system/test.jsonc': '...' };
    const tree = buildTree(defs);
    expect(tree[0].name).toBe('arm');
  });
});
