<template>
  <div class="space-y-2">
    <div
      v-for="(field, idx) in visibleFields"
      :key="idx"
      :data-field="field.name"
    >
      <!-- Color indicator -->
      <div
        class="w-3 h-3 rounded-full mt-1 flex-shrink-0"
        :style="{ backgroundColor: getFieldColor(idx) }"
      ></div>

      <!-- Field info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-2">
          <span class="font-bold text-sm text-gray-800">
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
  if (field.enumMatch !== undefined) return 'text-green-600';
  return 'text-gray-700';
}

function getDescClass(field: DecodedField): string {
  if (field.enumMatch !== undefined) return 'text-green-700';
  return 'text-gray-600';
}
</script>
