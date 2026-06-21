import type { DecodedField } from "@regdecoder/core";

export function getAnnotations(fields: DecodedField[]): string[] {
  const byName = new Map(fields.map((f) => [f.name, f]));

  const pml4 = byName.get("PML4");
  if (!pml4) return [];

  const physAddr = pml4.rawValue << 12n;
  return [`Physical Address: 0x${physAddr.toString(16).toUpperCase()}`];
}
