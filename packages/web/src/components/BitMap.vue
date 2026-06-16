<template>
  <svg
    :viewBox="viewBox"
    class="w-full border rounded bg-white select-none"
    :style="{ maxWidth: maxWidth + 'px' }"
  >
    <g v-for="(cell, idx) in cells" :key="idx">
      <rect
        :x="cell.x"
        :y="cell.y"
        :width="CELL_SIZE"
        :height="CELL_SIZE"
        :fill="cell.color"
        :stroke="hoveredFieldName === cell.fieldName ? '#1e293b' : '#e2e8f0'"
        :stroke-width="hoveredFieldName === cell.fieldName ? 2 : 1"
        :data-field="cell.fieldName"
        @click="$emit('bit-click', cell.bitIndex)"
        @mouseenter="onMouseEnter(cell)"
        @mouseleave="onMouseLeave"
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
    <!-- Tooltip -->
    <g v-if="hoveredFieldName">
      <rect
        :x="tooltipX"
        :y="tooltipY"
        :width="tooltipTextWidth"
        :height="16"
        fill="#1e293b"
        rx="3"
      />
      <text
        :x="tooltipX + 4"
        :y="tooltipY + 11"
        class="text-[10px] font-mono font-bold fill-white"
      >{{ hoveredFieldName }}</text>
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { DecodeResult, Register } from '@regdecoder/core';

const CELL_SIZE = 28;
const CELL_GAP = 2;
const COLS = 32;

const FIELD_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#4ade80',
  '#34d399', '#2dd4bf', '#22d3ee', '#60a5fa', '#818cf8', '#c084fc',
];
const RESERVED_COLOR = '#9ca3af';

interface Cell {
  bitIndex: number;
  x: number;
  y: number;
  color: string;
  value: string;
  fieldName: string;
}

const props = defineProps({
  result: { type: Object as PropType<DecodeResult>, required: true },
  register: { type: Object as PropType<Register>, required: true },
  hoveredField: { type: String as PropType<string | null>, default: null },
});

const emit = defineEmits<{
  'bit-click': [bitIndex: number];
  'field-hover': [fieldName: string | null];
}>();

function onMouseEnter(cell: Cell) {
  emit('field-hover', cell.fieldName);
}

function onMouseLeave() {
  emit('field-hover', null);
}

const hoveredFieldName = computed(() => props.hoveredField);

const rows = computed(() => Math.max(1, Math.ceil(props.register.width / COLS)));

const maxWidth = computed(() => COLS * (CELL_SIZE + CELL_GAP) + 10);
const svgWidth = computed(() => COLS * (CELL_SIZE + CELL_GAP));
const svgHeight = computed(() => rows.value * (CELL_SIZE + CELL_GAP) + 18);
const viewBox = computed(() => `0 0 ${svgWidth.value} ${svgHeight.value}`);

// Build maps: bit index -> color, bit index -> field name
const bitInfo = computed(() => {
  const color: Record<number, string> = {};
  const name: Record<number, string> = {};
  let colorIdx = 0;
  for (const field of props.result.fields) {
    const c = field.isReserved ? RESERVED_COLOR : FIELD_COLORS[colorIdx % FIELD_COLORS.length];
    for (const pos of field.bitPositions) {
      color[pos] = c;
      name[pos] = field.name;
    }
    if (!field.isReserved) colorIdx++;
  }
  return { color, name };
});

const cells = computed<Cell[]>(() => {
  const w = props.register.width;
  const result: Cell[] = [];
  for (let i = 0; i < w; i++) {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const bitIndex = w - 1 - i;
    const bitVal = (props.result.truncatedValue >> BigInt(bitIndex)) & 1n;
    result.push({
      bitIndex,
      x: col * (CELL_SIZE + CELL_GAP),
      y: row * (CELL_SIZE + CELL_GAP),
      color: bitInfo.value.color[bitIndex] ?? RESERVED_COLOR,
      value: bitVal.toString(),
      fieldName: bitInfo.value.name[bitIndex] ?? 'Reserved',
    });
  }
  return result;
});

// Tooltip placed above the first cell of the hovered field
const tooltipX = computed(() => {
  if (!hoveredFieldName.value) return 0;
  const cell = cells.value.find(c => c.fieldName === hoveredFieldName.value);
  return cell ? cell.x : 0;
});

const tooltipY = computed(() => {
  if (!hoveredFieldName.value) return 0;
  const cell = cells.value.find(c => c.fieldName === hoveredFieldName.value);
  if (!cell) return 0;
  return cell.y < 18 ? cell.y + CELL_SIZE + 4 : cell.y - 18;
});

const tooltipTextWidth = computed(() => {
  if (!hoveredFieldName.value) return 0;
  return hoveredFieldName.value.length * 6.5 + 8;
});
</script>
