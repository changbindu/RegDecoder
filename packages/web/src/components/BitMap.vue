<template>
  <svg
    :viewBox="viewBox"
    class="w-full border rounded bg-white"
    :style="{ maxWidth: maxWidth + 'px' }"
  >
    <g v-for="(cell, idx) in cells" :key="idx">
      <rect
        :x="cell.x"
        :y="cell.y"
        :width="CELL_SIZE"
        :height="CELL_SIZE"
        :fill="cell.color"
        :stroke="cell.hovered ? '#1e293b' : '#e2e8f0'"
        stroke-width="1"
        class="cursor-pointer transition-colors"
        @click="$emit('bit-click', cell.bitIndex)"
        @mouseenter="cell.hovered = true"
        @mouseleave="cell.hovered = false"
        rx="2"
      />
      <text
        :x="cell.x + 2"
        :y="cell.y + 9"
        class="text-[7px] font-mono fill-white"
      >{{ cell.bitIndex }}</text>
      <text
        :x="cell.x + CELL_SIZE / 2"
        :y="cell.y + CELL_SIZE - 8"
        text-anchor="middle"
        class="text-[9px] font-bold fill-white"
      >{{ cell.value }}</text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { DecodeResult, Register } from '@regdecoder/core';

const CELL_SIZE = 28;
const CELL_GAP = 2;
const COLS = 16;

const FIELD_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#4ade80',
  '#34d399', '#2dd4bf', '#22d3ee', '#60a5fa', '#818cf8', '#c084fc',
];
const RESERVED_COLOR = '#94a3b8';

interface Cell {
  bitIndex: number;
  x: number;
  y: number;
  color: string;
  value: string;
  hovered: boolean;
}

const props = defineProps({
  result: { type: Object as PropType<DecodeResult>, required: true },
  register: { type: Object as PropType<Register>, required: true },
});

defineEmits<{
  'bit-click': [bitIndex: number];
}>();

const rows = computed(() => {
  const w = props.register.width;
  if (w <= 16) return 1;
  if (w <= 32) return 2;
  return 4;
});

const maxWidth = computed(() => COLS * (CELL_SIZE + CELL_GAP) + 10);
const svgWidth = computed(() => COLS * (CELL_SIZE + CELL_GAP));
const svgHeight = computed(() => rows.value * (CELL_SIZE + CELL_GAP));
const viewBox = computed(() => `0 0 ${svgWidth.value} ${svgHeight.value}`);

// Build color map: bit index -> color
const colorMap = computed(() => {
  const map: Record<number, string> = {};
  let colorIdx = 0;
  for (const field of props.result.fields) {
    if (field.isReserved) continue;
    const color = FIELD_COLORS[colorIdx % FIELD_COLORS.length];
    for (const pos of field.bitPositions) {
      map[pos] = color;
    }
    colorIdx++;
  }
  return map;
});

const cells = computed<Cell[]>(() => {
  const w = props.register.width;
  const result: Cell[] = [];
  for (let i = 0; i < w; i++) {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const bitIndex = w - 1 - i; // MSB left, LSB right
    const bitVal = (props.result.truncatedValue >> BigInt(bitIndex)) & 1n;
    const color = colorMap.value[bitIndex] ?? RESERVED_COLOR;
    result.push({
      bitIndex,
      x: col * (CELL_SIZE + CELL_GAP),
      y: row * (CELL_SIZE + CELL_GAP),
      color,
      value: bitVal.toString(),
      hovered: false,
    });
  }
  return result;
});
</script>
