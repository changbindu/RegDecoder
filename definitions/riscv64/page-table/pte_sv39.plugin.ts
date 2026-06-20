import type { DecodedField } from "@regdecoder/core";

export function getAnnotations(fields: DecodedField[]): string[] {
  const byName = new Map(fields.map((f) => [f.name, f]));

  // PTE type: leaf vs non-leaf
  const r = byName.get("R")?.rawValue ?? 0n;
  const w = byName.get("W")?.rawValue ?? 0n;
  const x = byName.get("X")?.rawValue ?? 0n;
  const pteType =
    r === 0n && w === 0n && x === 0n
      ? "Non-leaf PTE (points to next-level page table)"
      : "Leaf PTE (maps a page)";

  // Physical address: concatenate PPN fields MSB-first, then << 12
  const ppnNames = ["PPN2", "PPN1", "PPN0"];
  const ppnFields = ppnNames
    .map((n) => byName.get(n))
    .filter((f): f is DecodedField => f !== undefined);

  let ppn = 0n;
  for (const f of ppnFields) {
    ppn = (ppn << BigInt(f.bitPositions.length)) | f.rawValue;
  }
  const physAddr = ppn << 12n;

  return [pteType, `Physical Address: 0x${physAddr.toString(16).toUpperCase()}`];
}
