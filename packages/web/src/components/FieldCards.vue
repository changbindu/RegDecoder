<template>
  <div class="space-y-1.5">
    <div
      v-for="(field, idx) in visibleFields"
      :key="idx"
      :data-field="field.name"
      class="border rounded bg-white"
      :style="{ borderColor: getFieldColor(idx) }"
    >
      <div class="px-2 py-1">
        <!-- Line 1: name + bits + value -->
        <div class="flex items-baseline gap-1.5 flex-wrap">
          <span class="font-bold text-[11px] text-gray-900 whitespace-nowrap">
            {{ field.name }}
          </span>
          <span class="text-[10px] text-gray-400 font-mono whitespace-nowrap">
            [{{ field.bits }}]
          </span>
          <span class="font-mono text-[11px] whitespace-nowrap" :class="getValueClass(field)">
            {{ field.binary }}
          </span>
          <span class="text-[10px] text-gray-400 font-mono whitespace-nowrap">
            ({{ field.hex }})
          </span>
        </div>
        <!-- Line 2: description -->
        <div class="text-[10px] leading-tight mt-0.5" :class="getDescClass(field)">
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
  return 'text-gray-600';
}

function getDescClass(field: DecodedField): string {
  if (field.enumMatch !== undefined) return 'text-green-600';
  return 'text-gray-400';
}
</script>
