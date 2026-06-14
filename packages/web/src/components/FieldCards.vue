<template>
  <div class="space-y-2">
    <div
      v-for="(field, idx) in result.fields"
      :key="idx"
      class="border rounded p-3 flex items-start gap-3"
      :class="field.isReserved ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'"
    >
      <!-- Color indicator -->
      <div
        class="w-3 h-3 rounded-full mt-1 flex-shrink-0"
        :style="{ backgroundColor: getFieldColor(idx, field.isReserved) }"
      ></div>

      <!-- Field info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-2">
          <span class="font-bold text-sm" :class="field.isReserved ? 'text-gray-400' : 'text-gray-800'">
            {{ field.name }}
          </span>
          <span class="text-xs text-gray-500 font-mono">
            [{{ field.bits }}]
          </span>
        </div>
        <div class="font-mono text-sm mt-1" :class="getValueClass(field)">
          {{ field.binary }} ({{ field.hex }})
        </div>
        <div class="text-sm mt-1" :class="getDescClass(field)">
          {{ field.enumMatch ?? (field.isReserved ? '-' : field.description) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DecodedField } from '@regdecoder/core';

const FIELD_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#4ade80',
  '#34d399', '#2dd4bf', '#22d3ee', '#60a5fa', '#818cf8', '#c084fc',
];
const RESERVED_COLOR = '#94a3b8';

defineProps<{
  result: { fields: DecodedField[] };
}>();

function getFieldColor(idx: number, isReserved: boolean): string {
  if (isReserved) return RESERVED_COLOR;
  // Count non-reserved fields before this one to get the color index
  return FIELD_COLORS[idx % FIELD_COLORS.length];
}

// Note: color index in FieldCards should match bit map. We'll reconcile via shared logic in App.vue
// For now, use the same cycle order.

function getValueClass(field: DecodedField): string {
  if (field.isReserved) return 'text-gray-400';
  if (field.enumMatch !== undefined) return 'text-green-600';
  return 'text-gray-700';
}

function getDescClass(field: DecodedField): string {
  if (field.isReserved) return 'text-gray-400';
  if (field.enumMatch !== undefined) return 'text-green-700';
  return 'text-gray-600';
}
</script>
