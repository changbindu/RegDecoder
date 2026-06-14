import { describe, it, expect } from 'vitest';
import { decode, parseRegister } from '../index.js';

function makeReg(name: string, width: 8 | 16 | 32 | 64, fields: any[]) {
  const json = JSON.stringify({ register: { name, width, fields } });
  return parseRegister(json);
}

describe('decode', () => {
  it('decodes single bit field with enum match', () => {
    const reg = makeReg('T', 32, [
      { name: 'EN', bits: '0', description: 'Enable', enums: [{ '0': 'off' }, { '1': 'on' }] }
    ]);
    const r = decode(reg, 1n);
    const en = r.fields.find(f => f.name === 'EN')!;
    expect(en.rawValue).toBe(1n);
    expect(en.enumMatch).toBe('on');
  });

  it('decodes single bit field value 0', () => {
    const reg = makeReg('T', 32, [
      { name: 'EN', bits: '0', description: 'Enable', enums: [{ '0': 'off' }, { '1': 'on' }] }
    ]);
    const r = decode(reg, 0n);
    const en = r.fields.find(f => f.name === 'EN')!;
    expect(en.rawValue).toBe(0n);
    expect(en.enumMatch).toBe('off');
  });

  it('extracts multi-bit field correctly', () => {
    const reg = makeReg('T', 32, [
      { name: 'MODE', bits: '0-2', description: 'Mode', enums: [{ '0': 'A' }, { '5': 'B' }] }
    ]);
    const r = decode(reg, 5n); // 0b101
    const mode = r.fields.find(f => f.name === 'MODE')!;
    expect(mode.rawValue).toBe(5n);
    expect(mode.enumMatch).toBe('B');
  });

  it('decodes discontinuous bits high-to-low', () => {
    // bits "0, 7-9" -> positions [9,8,7,0]
    // value 0x380 = 0b1110000000 -> bits: 9=1,8=1,7=1,0=0 -> 0b1110 = 14
    const reg = makeReg('T', 16, [
      { name: 'F', bits: '0, 7-9', description: 'test' }
    ]);
    const r = decode(reg, 0x380n);
    const f = r.fields.find(fld => fld.name === 'F')!;
    expect(f.rawValue).toBe(14n);
    expect(f.binary).toBe('0b1110');
  });

  it('detects truncation', () => {
    const reg = makeReg('T', 8, [
      { name: 'X', bits: '0', description: 'd' }
    ]);
    const r = decode(reg, 0x1FFn);
    expect(r.isTruncated).toBe(true);
    expect(r.truncatedValue).toBe(255n); // 0xFF
  });

  it('does not truncate value within range', () => {
    const reg = makeReg('T', 8, []);
    const r = decode(reg, 0xFFn);
    expect(r.isTruncated).toBe(false);
    expect(r.truncatedValue).toBe(255n);
  });

  it('detects reserved bits', () => {
    const reg = makeReg('T', 32, [
      { name: 'EN', bits: '0', description: 'Enable' }
    ]);
    const r = decode(reg, 0n);
    const reserved = r.fields.find(f => f.isReserved);
    expect(reserved).toBeDefined();
    expect(reserved!.bitPositions).toContain(31);
    expect(reserved!.bitPositions).not.toContain(0);
  });

  it('all bits reserved when no fields', () => {
    const reg = makeReg('T', 8, []);
    const r = decode(reg, 0xFFn);
    expect(r.fields).toHaveLength(1);
    expect(r.fields[0].isReserved).toBe(true);
    expect(r.fields[0].bitPositions).toEqual([7,6,5,4,3,2,1,0]);
    expect(r.fields[0].rawValue).toBe(255n);
  });

  it('handles 64-bit registers', () => {
    const reg = makeReg('T', 64, [
      { name: 'HI', bits: '63', description: 'High bit' },
      { name: 'LO', bits: '0', description: 'Low bit' }
    ]);
    const r = decode(reg, 0x8000000000000001n);
    expect(r.isTruncated).toBe(false);
    const hi = r.fields.find(f => f.name === 'HI')!;
    const lo = r.fields.find(f => f.name === 'LO')!;
    expect(hi.rawValue).toBe(1n);
    expect(lo.rawValue).toBe(1n);
  });

  it('handles 8-bit registers', () => {
    const reg = makeReg('T', 8, [
      { name: 'ALL', bits: '0-7', description: 'Whole register' }
    ]);
    const r = decode(reg, 0xA5n);
    const f = r.fields.find(fld => fld.name === 'ALL')!;
    expect(f.rawValue).toBe(0xA5n);
    expect(f.bitPositions).toEqual([7,6,5,4,3,2,1,0]);
  });

  it('handles missing enum gracefully', () => {
    const reg = makeReg('T', 32, [
      { name: 'MODE', bits: '0-1', description: 'Mode', enums: [{ '0': 'A' }, { '1': 'B' }] }
    ]);
    const r = decode(reg, 2n); // 0b10 = 2, no match
    const mode = r.fields.find(f => f.name === 'MODE')!;
    expect(mode.rawValue).toBe(2n);
    expect(mode.enumMatch).toBeUndefined();
  });

  it('formats field hex and binary correctly', () => {
    const reg = makeReg('T', 32, [
      { name: 'F', bits: '0-3', description: 'test' }
    ]);
    const r = decode(reg, 10n); // 0b1010
    const f = r.fields.find(fld => fld.name === 'F')!;
    expect(f.hex).toBe('0xa');
    expect(f.binary).toBe('0b1010');
  });

  it('sorts fields by highest bit position descending', () => {
    const reg = makeReg('T', 32, [
      { name: 'LO', bits: '0-1', description: 'low' },
      { name: 'HI', bits: '30-31', description: 'high' },
      { name: 'MID', bits: '15', description: 'mid' },
    ]);
    const r = decode(reg, 0n);
    expect(r.fields[0].name).toBe('HI');
    expect(r.fields[1].name).toBe('RESERVED');
    expect(r.fields[2].name).toBe('MID');
    expect(r.fields[3].name).toBe('LO');
    // RESERVED after if present
  });
});
