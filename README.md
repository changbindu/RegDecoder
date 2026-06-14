# RegDecoder

A register bit-field analyzer for embedded developers, driver engineers, and hardware debuggers. Decodes raw hex/binary register values into named bit fields using JSONC definition files. Available as a Web UI and CLI.

## Features

- **64-bit precision** — BigInt-based math, zero precision loss on 64-bit registers
- **Discontinuous bit fields** — `"bits": "0, 7-9"` extracts bits [9,8,7,0] high-to-low
- **Live reactive decoding** — no "parse" button; type and see results instantly
- **Reserved bit auto-detection** — bits not claimed by any field are flagged automatically
- **Truncation detection** — input values exceeding register width are flagged
- **JSONC definitions** — register specs in commented JSON, organized as a directory tree
- **Color-coded output** — distinct color per field in both Web UI and CLI

## Project Structure

```
regdecoder/
├── packages/
│   ├── core/      # Pure TS logic (jsonc-parser, BigInt math, decode/encode)
│   ├── web/       # Vue 3 + Vite + Tailwind SPA with SVG bit-map visualization
│   └── cli/       # Commander.js CLI with Chalk + Cli-Table3 output
├── definitions/   # JSONC register definition tree
│   └── arm/system/
│       ├── sctlr_el1.jsonc      # System Control Register
│       ├── tcr_el1.jsonc        # Translation Control Register
│       ├── esr_el1.jsonc        # Exception Syndrome Register
│       ├── midr_el1.jsonc       # Main ID Register
│       └── currentel.jsonc      # Current Exception Level
└── pnpm-workspace.yaml
```

## Quick Start

```bash
# Install dependencies (requires Node >= 22, pnpm >= 10)
pnpm install

# Build everything
pnpm build

# Run core unit tests (58 tests)
pnpm --filter @regdecoder/core test

# Run CLI integration tests (13 tests)
pnpm --filter @regdecoder/cli test

# Run all tests (71 tests)
pnpm -r test

# Start the web dev server
pnpm --filter @regdecoder/web dev
# → http://localhost:5173

# Run the CLI
pnpm --filter @regdecoder/cli dev -- 0x96000000 -r esr_el1
```

## CLI Usage

```bash
regdec <value> -r <register-name> [-b]
```

### Arguments

- `<value>` — register value: `0x...` (hex), `0b...` (binary), or decimal. Spaces and underscores are stripped (e.g., `0x1234_5678` works).
- `-r, --register <name>` — register name (e.g. `esr_el1`, `SCTLR_EL1`). Case-insensitive, searched recursively in the definitions directory.
- `-d, --definitions <dir>` — definitions directory (default: `definitions/` at project root).
- `-b, --bits` — also print a bit-by-bit binary distribution.

### Example

```bash
$ regdec 0x96000000 -r esr_el1

ESR_EL1 (64-bit) = 0b...10010110000000000000000000000000
┌──────────┬────────┬────────────────┬──────────────────────────┐
│ Field    │ Bits   │ Value          │ Description              │
├──────────┼────────┼────────────────┼──────────────────────────┤
│ EC       │ 31-26  │ 0b100101 (0x25)│ Data Abort from same EL  │
│ IL       │ 25     │ 0b1 (0x1)      │ 32-bit instruction       │
│ ISS      │ 24-0   │ 0b... (0x0)    │ Instruction Specific...  │
│ RESERVED │ 63-32  │ 0b... (0x0)    │ -                        │
└──────────┴────────┴────────────────┴──────────────────────────┘
```

Truncation warning is shown in red when the input value exceeds the register width. Enum matches are highlighted in green; reserved bits are gray.

## JSONC Definition Format

Each register is one JSONC file:

```jsonc
{
  // Comments are allowed (this is JSONC)
  "register": {
    "name": "CTRL_REG",
    "width": 32,                       // 8, 16, 32, or 64
    "fields": [
      {
        "name": "ENABLE",
        "bits": "0, 7-9",              // Discontinuous: bits 9,8,7,0
        "description": "Module enable",
        "enums": [
          { "0": "disabled" },
          { "1": "enabled" }
        ]
      },
      {
        "name": "MODE",
        "bits": "4-6",
        "description": "Operating mode"
      }
    ]
  }
}
```

### Bit-field rules

- **Bit notation**: single bits (`"0"`), ranges (`"7-9"`), or comma-separated mixes (`"0, 7-9"`).
- **Concatenation order**: all referenced bits are sorted high-to-low, then concatenated MSB-first to form the field value. Example: `"bits": "0, 7-9"` over a register value `0x380` (binary `1110000000`) gives bit positions `[9,8,7,0]` with values `1,1,1,0` → field value `0b1110 = 14`.
- **Enum keys**: match the **extracted** field value (after concatenation), not the register-positional value. So a 2-bit field at bits `[3:2]` with value `EL1` (binary `01` in those positions) uses enum key `"1"`, not `"4"`.
- **Reserved bits**: any bit position from `0` to `width-1` not declared in any field is automatically grouped into a synthetic `RESERVED` field.

## Web UI

The web app is a static SPA. Definitions are bundled at build time via Vite's `import.meta.glob`.

- **Left panel**: searchable folder tree of register definitions
- **Right panel**: register name, value input, SVG bit-map, field detail cards
- **Click a bit** to toggle it; the input field, bit-map, and cards all update reactively (single-source-of-truth Vue composable)
- **12-color palette** cycles through fields; reserved bits are gray
- **Truncation warning** appears in amber when the input exceeds register width

## Building & Distribution

```bash
# Build all packages
pnpm build

# Build a single package
pnpm --filter @regdecoder/core build
pnpm --filter @regdecoder/cli build
pnpm --filter @regdecoder/web build

# CLI is a single ESM file with shebang at packages/cli/dist/index.js
node packages/cli/dist/index.js 0x96000000 -r esr_el1

# Web SPA output at packages/web/dist/ (deploy as static files)
```

## Tech Stack

- **Build**: pnpm workspaces, tsup, Vite
- **Core**: TypeScript, jsonc-parser, BigInt
- **Web**: Vue 3 (Composition API), Tailwind CSS v4, Headless UI, SVG
- **CLI**: Commander.js, Chalk, Cli-Table3
- **Tests**: Vitest (core: 58 unit tests, cli: 13 integration tests)

## Development

```bash
# Run core tests in watch mode (separate terminals)
pnpm --filter @regdecoder/core dev   # watch tsup build
pnpm --filter @regdecoder/core test  # run tests

# Web dev server with HMR
pnpm --filter @regdecoder/web dev

# Run CLI directly via tsx (no build step)
pnpm --filter @regdecoder/cli dev -- <value> -r <register-name>
```

## Adding New Registers

1. Create a `.jsonc` file under `definitions/<vendor>/<arch>/<peripheral>/<reg>.jsonc`.
2. Follow the JSONC format above.
3. Rebuild the web app (`pnpm --filter @regdecoder/web build`) to bundle the new definition. Dev mode (`pnpm dev`) picks up changes automatically.
4. The CLI reads JSONC files at runtime — no rebuild needed.

## License

MIT
