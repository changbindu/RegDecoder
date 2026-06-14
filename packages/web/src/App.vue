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
      <!-- Register header -->
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

      <!-- Workspace content -->
      <main class="flex-1 overflow-y-auto p-4 space-y-4">
        <template v-if="regState.selectedRegister.value">
          <!-- Value Input -->
          <ValueInput
            v-model="regState.inputValue.value"
            :register="regState.selectedRegister.value"
            :is-truncated="regState.decodeResult.value?.isTruncated ?? false"
            :error="regState.inputError.value"
          />

          <!-- Results -->
          <template v-if="regState.decodeResult.value">
            <!-- Bit Map -->
            <div class="border rounded p-3 bg-gray-50">
              <BitMap
                :result="regState.decodeResult.value"
                :register="regState.selectedRegister.value"
                @bit-click="regState.flipBit"
              />
            </div>

            <!-- Field Cards -->
            <div class="relative">
              <FieldCards :result="regState.decodeResult.value" />
            </div>
          </template>

          <p v-else-if="regState.inputValue.value && !regState.inputError.value" class="text-gray-400 text-sm">
            Enter a valid register value to see decoded fields.
          </p>
        </template>

        <!-- Empty state -->
        <div v-else class="flex items-center justify-center h-64 text-gray-400">
          <p>Select a register definition to get started.</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Register } from '@regdecoder/core';
import { buildTree } from '@regdecoder/core';
import RegisterTree from './components/RegisterTree.vue';
import ValueInput from './components/ValueInput.vue';
import BitMap from './components/BitMap.vue';
import FieldCards from './components/FieldCards.vue';
import { useRegDecoder } from './composables/useRegDecoder';

// Load definitions via Vite glob
const definitionsRaw = import.meta.glob('../../definitions/arm/aarch64/system/*.jsonc', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Build tree from definitions
const definitions = definitionsRaw;
const tree = computed(() => buildTree(definitionsRaw));

// State
const regState = useRegDecoder();

function onSelectRegister(register: Register, path: string) {
  regState.selectRegister(register);
}
</script>
