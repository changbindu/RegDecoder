import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import fs from 'node:fs';
import path from 'node:path';
import { parseValue, parseRegister, decode, formatBinary } from '@regdecoder/core';

function findDefinition(registerName: string, definitionsDir: string): string | null {
  const normalized = registerName.toLowerCase();
  function walk(dir: string): string | null {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = walk(full);
        if (found) return found;
      } else if (entry.isFile() && entry.name.endsWith('.jsonc')) {
        if (path.basename(entry.name, '.jsonc').toLowerCase() === normalized) {
          return full;
        }
      }
    }
    return null;
  }
  return walk(definitionsDir);
}

function resolveProjectRoot(): string {
  let dir = process.cwd();
  let fallback = dir;
  while (dir !== path.dirname(dir)) {
    const ws = path.join(dir, 'pnpm-workspace.yaml');
    const defs = path.join(dir, 'definitions');
    if (fs.existsSync(ws) && fs.existsSync(defs)) return dir;
    if (fs.existsSync(ws)) fallback = dir;
    dir = path.dirname(dir);
  }
  return fallback;
}

const projectRoot = resolveProjectRoot();

const program = new Command();

program
  .name('regdec')
  .description('Register decoder - decode raw register values into bit fields')
  .argument('<value>', 'register value (hex 0x..., binary 0b..., decimal)')
  .requiredOption('-r, --register <name>', 'register name (e.g. currentel, SCTLR_EL1)')
  .option('-d, --definitions <dir>', 'definitions directory', path.join(projectRoot, 'definitions'))
  .option('-b, --bits', 'output raw binary distribution')
  .action(async (value: string, opts: { register: string; definitions: string; bits?: boolean }) => {
    let bigValue: bigint;
    try {
      bigValue = parseValue(value);
    } catch (e) {
      console.error(chalk.red('Error: Invalid register value - ' + (e instanceof Error ? e.message : String(e))));
      process.exit(1);
    }

    const definitionPath = findDefinition(opts.register, opts.definitions);
    if (!definitionPath) {
      console.error(chalk.red(`Error: Register '${opts.register}' not found in '${opts.definitions}'`));
      process.exit(1);
    }

    let jsoncContent: string;
    try {
      jsoncContent = fs.readFileSync(definitionPath, 'utf-8');
    } catch (e) {
      console.error(chalk.red('Error: Cannot read register file - ' + (e instanceof Error ? e.message : String(e))));
      process.exit(1);
    }

    let register;
    try {
      register = parseRegister(jsoncContent);
    } catch (e) {
      console.error(chalk.red('Error: Invalid register definition - ' + (e instanceof Error ? e.message : String(e))));
      process.exit(1);
    }

    const result = decode(register, bigValue);

    // Load annotations from companion plugin file
    const pluginPath = definitionPath.replace(/\.jsonc$/, '.plugin.ts');
    if (fs.existsSync(pluginPath)) {
      try {
        const plugin = await import(pluginPath);
        if (typeof plugin.getAnnotations === 'function') {
          const annotations = plugin.getAnnotations(result.fields);
          if (annotations.length > 0) {
            console.log(chalk.gray(annotations.join(', ')));
          }
        }
      } catch { /* plugin loading failed, silently skip */ }
    }

    if (result.isTruncated) {
      console.log(chalk.red(`Warning: Input value exceeds register width (${register.width}-bit). High bits truncated.`));
      console.log(chalk.red(`  Truncated value: ${formatBinary(result.truncatedValue, register.width)}`));
      console.log();
    }

    const table = new Table({
      head: ['Field', 'Bits', 'Value', 'Description'],
      colWidths: [20, 20, 30, 40],
      wordWrap: true,
    });

    for (const field of result.fields) {
      const valueStr = field.binary + ' (' + field.hex + ')';
      const desc = field.enumMatch
        ? field.enumMatch
        : field.isReserved
          ? '-'
          : field.description;

      let fieldName = field.name;
      let valColored = valueStr;
      let descColored = desc;

      if (field.isReserved) {
        fieldName = chalk.gray(field.name);
        valColored = chalk.gray(valueStr);
        descColored = chalk.gray(desc);
      } else if (field.enumMatch !== undefined) {
        fieldName = chalk.green(field.name);
        valColored = chalk.green(valueStr);
        descColored = chalk.green(desc);
      }

      table.push([fieldName, field.bits, valColored, descColored]);
    }

    console.log(chalk.bold(`${register.name} (${register.width}-bit) = ${formatBinary(result.truncatedValue, register.width)}`));
    console.log(table.toString());

    if (opts.bits) {
      console.log();
      console.log(chalk.bold('Binary Distribution:'));
      for (let i = register.width - 1; i >= 0; i--) {
        const bitVal = (result.truncatedValue >> BigInt(i)) & 1n;
        const label = `Bit ${String(i).padStart(2, ' ')}`;
        console.log(`  ${label}: ${bitVal}`);
      }
    }
  });

const argv = process.argv.slice(2);
const filtered = argv[0] === '--' ? argv.slice(1) : argv;

program.parse(filtered, { from: 'user' });
