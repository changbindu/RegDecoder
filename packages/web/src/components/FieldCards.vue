<template>
  <div class="space-y-3">
    <div
      v-for="(field, idx) in visibleFields"
      :key="idx"
      :data-field="field.name"
      class="border-2 rounded-lg bg-white shadow-sm"
      :style="{ borderColor: getFieldColor(idx) }"
    >
      <div class="p-3">
        <!-- Header: name + bits -->
        <div class="flex items-baseline gap-2 mb-2">
          <span class="font-bold text-sm text-gray-900">
            {{ field.name }}
          </span>
          <span class="text-[11px] text-gray-400 font-mono">
            bits [{{ field.bits }}]
          </span>
        </div>

        <!-- Value -->
        <div
          class="font-mono text-sm px-2 py-1 rounded bg-gray-50 border border-gray-100 mb-2"
          :class="getValueClass(field)"
        >
          {{ field.binary }} <span class="text-gray-400">({{ field.hex }})</span>
        </div>

        <!-- Description / Enum match -->
        <div class="text-sm leading-relaxed" :class="getDescClass(field)">
          {{ field.enumMatch ?? field.description }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DecodedField } from '@regdecoder/core';

const FIELD_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#4ade80',
  '#34d399', '#2dd4bf', '#22d3ee', '#60a5fa', '#818cf8', '#c084fc',
];

const props = defineProps<{
  result: { fields: DecodedField[] };
}>();

const visibleFields = computed(() => props.result.fields.filter(f => !f.isReserved));

function getFieldColor(idx: number): string {
  return FIELD_COLORS[idx % FIELD_COLORS.length];
}

function getValueClass(field: DecodedField): string {
  if (field.enumMatch !== undefined) return 'text-green-700';
  return 'text-gray-700';
}

function getDescClass(field: DecodedField): string {
  if (field.enumMatch !== undefined) return 'text-green-700 font-medium';
  return 'text-gray-500';
}
</script>
