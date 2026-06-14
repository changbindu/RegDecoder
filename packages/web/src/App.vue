<template>
  <div class="flex h-screen bg-white">
    <!-- Left Panel: Register Tree -->
    <div class="w-1/4 min-w-[220px] bg-gray-50 border-r border-gray-200 flex flex-col">
      <header class="border-b border-gray-200 p-4">
        <h1 class="text-lg font-bold text-gray-800">RegDecoder</h1>
        <p class="text-xs text-gray-500 mt-1">Register Bit-Field Analyzer</p>
      </header>
      <RegisterTree
        v-if="tree.length > 0"
        :tree="tree"
        :definitions="definitions"
        @select="onSelectRegister"
      />
      <p v-else class="p-4 text-sm text-gray-400">Loading definitions...</p>
    </div>

    <!-- Right Panel: Workspace -->
    <div class="w-3/4 flex flex-col min-w-0">
      <header class="border-b border-gray-200 p-4 flex-shrink-0">
        <template v-if="regState.selectedRegister.value">
          <h2 class="text-lg font-semibold text-gray-800">
            {{ regState.selectedRegister.value.name }}
            <span class="text-sm font-normal text-gray-500 ml-2">
              ({{ regState.selectedRegister.value.width }}-bit)
            </span>
          </h2>
        </template>
        <p v-else class="text-gray-400 text-sm">
          Select a register from the tree to begin decoding.
        </p>
      </header>

      <main ref="workspaceRef" class="flex-1 overflow-y-auto p-4 space-y-4 relative">
        <template v-if="regState.selectedRegister.value">
          <ValueInput
            v-model="regState.inputValue.value"
            :register="regState.selectedRegister.value"
            :is-truncated="regState.decodeResult.value?.isTruncated ?? false"
            :error="regState.inputError.value"
          />

          <template v-if="regState.decodeResult.value">
            <div class="border rounded p-3 bg-gray-50">
              <BitMap
                :result="regState.decodeResult.value"
                :register="regState.selectedRegister.value"
                @bit-click="regState.flipBit"
                @field-hover="onFieldHover"
              />
            </div>

            <div class="relative">
              <FieldCards :result="regState.decodeResult.value" />
            </div>

            <!-- Connector lines overlay -->
            <svg
              v-if="hoveredField"
              class="absolute inset-0 pointer-events-none"
              style="z-index: 1; width: 100%; height: 100%;"
            >
              <polyline
                :points="connectorPoints"
                :stroke="connectorColor"
                stroke-width="2.5"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </template>

          <p v-else-if="regState.inputValue.value && !regState.inputError.value" class="text-gray-400 text-sm">
            Enter a valid register value to see decoded fields.
          </p>
        </template>

        <div v-else class="flex items-center justify-center h-64 text-gray-400">
          <p>Select a register definition to get started.</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Register } from '@regdecoder/core';
import { buildTree } from '@regdecoder/core';
import RegisterTree from './components/RegisterTree.vue';
import ValueInput from './components/ValueInput.vue';
import BitMap from './components/BitMap.vue';
import FieldCards from './components/FieldCards.vue';
import { useRegDecoder } from './composables/useRegDecoder';

const definitionsRaw = import.meta.glob('../../../definitions/aarch64/system/*.jsonc', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const definitions = definitionsRaw;
const tree = computed(() => buildTree(definitionsRaw));
const regState = useRegDecoder();

const workspaceRef = ref<HTMLElement | null>(null);
const hoveredField = ref<string | null>(null);

const FIELD_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635', '#4ade80',
  '#34d399', '#2dd4bf', '#22d3ee', '#60a5fa', '#818cf8', '#c084fc',
];

function onSelectRegister(register: Register, path: string) {
  regState.selectRegister(register);
  hoveredField.value = null;
}

function onFieldHover(fieldName: string | null) {
  hoveredField.value = fieldName;
}

const connectorColor = computed(() => {
  if (!hoveredField.value || !regState.decodeResult.value) return '#94a3b8';
  let idx = 0;
  for (const f of regState.decodeResult.value.fields) {
    if (f.isReserved) continue;
    if (f.name === hoveredField.value) return FIELD_COLORS[idx % FIELD_COLORS.length];
    idx++;
  }
  return '#94a3b8';
});

const connectorPoints = computed(() => {
  if (!hoveredField.value || !workspaceRef.value) return '';
  return computePolyline(hoveredField.value, workspaceRef.value);
});

function computePolyline(fieldName: string, container: HTMLElement): string {
  const escaped = CSS.escape(fieldName);
  const svgEl = container.querySelector('svg') as SVGSVGElement | null;
  const targetCard = container.querySelector(`div[data-field="${escaped}"]`) as HTMLElement | null;
  if (!svgEl || !targetCard) return '';

  const result = regState.decodeResult.value;
  if (!result) return '';

  const containerRect = container.getBoundingClientRect();
  const tgtRect = targetCard.getBoundingClientRect();
  const svgRect = svgEl.getBoundingClientRect();
  const vb = svgEl.viewBox.baseVal;

  // Find the field's highest bit position
  let highestBit = -1;
  for (const f of result.fields) {
    if (f.name === fieldName && f.bitPositions.length > 0) {
      highestBit = f.bitPositions[0];
      break;
    }
  }
  if (highestBit < 0) return '';

  // Compute cell right edge in viewBox space
  const w = result.width;
  const COLS = 32, CELL = 30; // CELL_SIZE + CELL_GAP = 28 + 2
  const idx = w - 1 - highestBit;
  const col = idx % COLS;
  const row = Math.floor(idx / COLS);
  const vx = col * CELL + 28; // right edge of cell in viewBox
  const vy = row * CELL + 14; // vertical center in viewBox

  // Map viewBox → screen, accounting for SVG border (1px each side)
  const border = 1;
  const scaleX = (svgRect.width - 2 * border) / vb.width;
  const scaleY = (svgRect.height - 2 * border) / vb.height;
  const svgLeft = svgRect.left + border;
  const svgTop = svgRect.top + border;

  const spacing = 8;
  const sx = Math.round(svgLeft + vx * scaleX - containerRect.left + spacing);
  const sy = Math.round(svgTop + vy * scaleY - containerRect.top);
  const tx = Math.round(tgtRect.left - containerRect.left - spacing);
  const ty = Math.round(tgtRect.top - containerRect.top + tgtRect.height / 2);

  const xRoute = 4;
  const isTopRow = row === 0;

  if (isTopRow) {
    const yOut = sy - 24;
    return `${sx},${sy} ${sx},${yOut} ${xRoute},${yOut} ${xRoute},${ty} ${tx},${ty}`;
  }
  const yOut = sy + 24;
  return `${sx},${sy} ${sx},${yOut} ${xRoute},${yOut} ${xRoute},${ty} ${tx},${ty}`;
}
</script>
