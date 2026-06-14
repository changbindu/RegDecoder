import { describe, it, expect } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const cli = path.resolve(import.meta.dirname, '../../dist/index.js');

const projectRoot = path.resolve(import.meta.dirname, '../../../..');

function run(args: string[]) {
  return execFileAsync('node', [cli, ...args], {
    cwd: projectRoot,
    timeout: 10000,
  });
}

describe('CLI integration', () => {
  it('decodes CurrentEL 0x4', async () => {
    const { stdout } = await run(['0x4', '-r', 'currentel']);
    expect(stdout).toContain('CurrentEL');
    expect(stdout).toContain('32-bit');
    expect(stdout).toContain('EL');
    expect(stdout).toContain('EL1');
  });

  it('decodes ESR_EL1 0x96000000', async () => {
    const { stdout } = await run(['0x96000000', '-r', 'esr_el1']);
    expect(stdout).toContain('ESR_EL1');
    expect(stdout).toContain('64-bit');
    expect(stdout).toContain('EC');
    expect(stdout).toContain('Data Abort');
  });

  it('decodes MIDR_EL1 0x410FD0C0', async () => {
    const { stdout } = await run(['0x410FD0C0', '-r', 'midr_el1']);
    expect(stdout).toContain('MIDR_EL1');
    expect(stdout).toContain('ARM Limited');
  });

  it('decodes SCTLR_EL1', async () => {
    const { stdout } = await run(['0x30D00800', '-r', 'sctlr_el1']);
    expect(stdout).toContain('SCTLR_EL1');
    expect(stdout).toContain('64-bit');
  });

  it('decodes TCR_EL1', async () => {
    const { stdout } = await run(['0x0', '-r', 'tcr_el1']);
    expect(stdout).toContain('TCR_EL1');
    expect(stdout).toContain('64-bit');
  });

  it('accepts binary input with 0b prefix', async () => {
    const { stdout } = await run(['0b100', '-r', 'currentel']);
    expect(stdout).toContain('CurrentEL');
    expect(stdout).toContain('EL1');
  });

  it('accepts decimal input', async () => {
    const { stdout } = await run(['4', '-r', 'currentel']);
    expect(stdout).toContain('EL1');
  });

  it('supports case-insensitive register name', async () => {
    const { stdout } = await run(['0x4', '-r', 'CURRENTEL']);
    expect(stdout).toContain('CurrentEL');
    expect(stdout).toContain('EL1');
  });

  it('shows binary distribution with -b flag', async () => {
    const { stdout } = await run(['0x4', '-r', 'currentel', '-b']);
    expect(stdout).toContain('Binary Distribution');
    expect(stdout).toContain('Bit 31');
    expect(stdout).toContain('Bit  0');
  });

  it('shows truncation warning for oversized value', async () => {
    const { stdout } = await run(['0x1FFFFFFFF', '-r', 'currentel']);
    expect(stdout).toContain('Warning');
    expect(stdout).toContain('truncated');
  });

  it('errors on missing register name', async () => {
    try {
      await run(['0x4']);
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.code).toBe(1);
      expect(e.stderr).toContain("required option '-r");
    }
  });

  it('errors on unknown register', async () => {
    try {
      await run(['0x4', '-r', 'nonexistent_reg']);
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.code).toBe(1);
      expect(e.stderr).toContain('not found');
    }
  });

  it('errors on invalid value', async () => {
    try {
      await run(['hello', '-r', 'currentel']);
      expect.unreachable('should have thrown');
    } catch (e: any) {
      expect(e.code).toBe(1);
      expect(e.stderr).toContain('Invalid register value');
    }
  });
});
