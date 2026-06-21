import type { DecodedField } from "@regdecoder/core";

export function getAnnotations(fields: DecodedField[]): string[] {
  const byName = new Map(fields.map((f) => [f.name, f]));

  const ppn = byName.get("PPN");
  if (!ppn) return [];

  const physAddr = ppn.rawValue << 12n;
  return [`Physical Address: 0x${physAddr.toString(16).toUpperCase()}`];
}
