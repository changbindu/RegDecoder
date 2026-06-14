# AGENTS.md — RegDecoder

A pnpm monorepo for decoding hardware register values into named bit fields. Three packages: `@regdecoder/core` (pure TS), `@regdecoder/web` (Vue 3 SPA), `@regdecoder/cli` (Commander CLI). Register definitions live as JSONC files under `definitions/`.

## Toolchain

- **Package manager**: pnpm 10.33+ (declared in root `package.json`)
- **Node**: ≥ 22 (BigInt usage everywhere)
- **Build**: tsup (core + cli), Vite 5 (web)
- **Test**: Vitest 2.x (core: 58 unit, cli: 13 integration)
- **Lint/format**: none configured — follow existing style
- **Language**: English only in code, comments, identifiers, and definitions. No Chinese unless the register spec itself requires it (e.g., vendor-provided field descriptions).

## Commands

```bash
pnpm install                           # first time setup
pnpm build                             # build all packages (order: core → cli/web)
pnpm test                              # all tests (71 total)

# Per-package
pnpm --filter @regdecoder/core test    # 58 unit tests
pnpm --filter @regdecoder/core dev     # watch-rebuild core on changes
pnpm --filter @regdecoder/cli test     # 13 integration tests (spawns built CLI binary)
pnpm --filter @regdecoder/cli build    # build CLI before testing
pnpm --filter @regdecoder/cli dev -- 0x96000000 -r esr_el1   # run CLI without building
pnpm --filter @regdecoder/web dev      # dev server on 0.0.0.0 (config in vite.config.ts)
```

**Build dependency**: `pnpm build` runs `pnpm -r build`. Core must build first (tsup generates dist/), then CLI/web can consume `@regdecoder/core` via workspace protocol. Tests require built output — run `pnpm build` before `pnpm test` on a clean checkout.

## Architecture

```
packages/core/     — pure functions, zero side effects, no DOM/node deps
  src/types.ts     — all shared TS interfaces
  src/formatter/   — parseValue(), formatHex(), formatBinary()
  src/parser/      — parseRegister() (JSONC→Register), buildTree(), parseBitPositions()
  src/decoder/     — decode(Register, bigint) → DecodeResult with reserved-bit detection
  src/encoder/     — encode(value, bitIndex) → EncodeResult (single-bit XOR flip)
  __tests__/       — 4 test files, 58 Vitest tests

packages/cli/      — Commander.js + Chalk + cli-table3
  src/index.ts     — CLI entry: resolves register by name (case-insensitive)
                     walks project root (finds pnpm-workspace.yaml) to locate definitions/
  __tests__/       — spawns built dist/index.js as child process

packages/web/      — Vue 3 Composition API + Tailwind v4 + Headless UI
  src/App.vue      — loads definitions via import.meta.glob (../../.. up to project root)
  src/composables/ — useRegDecoder.ts (single-source-of-truth state)
  src/components/  — RegisterTree, BitMap (SVG 32-bit/row), FieldCards, ValueInput
```

## Key conventions

- **ESM only** — all packages use `"type": "module"`, tsup outputs ESM
- **BigInt for all values** — register values up to 64-bit, zero precision loss
- **Bit positions** — sorted descending (MSB-first concatenation). `parseBitPositions("0,7-9")` → `[9,8,7,0]`
- **Enum keys** — use the **extracted field value** (after concatenation), NOT the register-positional value
- **Reserved bits** — `decode()` auto-detects unclaimed bits and creates a synthetic `Reserved` field
- **Definitions directory** — `<vendor>/<arch>/<reg>.jsonc`. Currently: `aarch64/system/*.jsonc`
- **CLI project root detection** — walks up from CWD looking for `pnpm-workspace.yaml` + `definitions/` directory
- **Web glob path** — `import.meta.glob('../../../definitions/aarch64/system/*.jsonc', { query: '?raw', ... })`. Must use `../../../` from `packages/web/src/` to reach project root. Changing depth requires updating both the glob AND the `buildTree()` path normalization regex in `packages/core/src/parser/index.ts`
- **buildTree() path normalization** — strips `../`, `./`, `definitions/`, and `.jsonc` from Vite glob keys. If glob path depth changes, the regex `/^(?:\.\.\/|\.\/)+/` may need adjustment
- **RegisterTree lookup** — matches normalized tree node paths against raw glob keys using `endsWith()` suffix search (not direct key lookup)
- **Colors** — 12-color Tailwind palette cycled for fields; reserved bits use `#9ca3af` (gray-400)
- **CLI -- separator** — when using `pnpm --filter ... dev -- <cli-args>`, the CLI strips the leading `--` from argv before passing to Commander

## Adding a new register definition

1. Create `definitions/aarch64/system/<reg>.jsonc`
2. Follow the schema: `{ "register": { "name": "X", "width": 32|64, "fields": [...] } }`
3. CLI picks it up immediately (runtime file search)
4. Web requires rebuild: `pnpm --filter @regdecoder/web build` (dev server picks up new files via HMR if running)
5. No need to update any code unless adding a new subdirectory (then update App.vue glob AND buildTree regex)
