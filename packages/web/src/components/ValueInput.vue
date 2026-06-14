<template>
  <div>
    <input
      :value="modelValue"
      @input="onInput"
      type="text"
      placeholder="Enter register value (e.g., 0x30D00800)"
      class="w-full px-3 py-2 border rounded font-mono text-sm focus:outline-none focus:ring-2"
      :class="inputClasses"
      :disabled="!register"
    />
    <div v-if="error" class="text-red-500 text-xs mt-1">{{ error }}</div>
    <div v-else-if="isTruncated" class="text-amber-600 text-xs mt-1">
      Warning: Value truncated to register width ({{ register?.width }}-bit)
    </div>
    <div v-else-if="modelValue && displayHex" class="text-gray-500 text-xs mt-1 font-mono">
      {{ displayHex }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { Register } from '@regdecoder/core';
import { parseValue, formatHex } from '@regdecoder/core';

const props = defineProps({
  modelValue: { type: String, required: true },
  register: { type: Object as PropType<Register | null>, default: null },
  isTruncated: { type: Boolean, default: false },
  error: { type: String as PropType<string | null>, default: null },
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const inputClasses = computed(() => {
  if (!props.register) return 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed';
  if (props.error) return 'border-red-400 focus:ring-red-400';
  if (props.isTruncated) return 'border-amber-400 focus:ring-amber-400';
  if (props.modelValue) return 'border-green-400 focus:ring-green-400';
  return 'border-gray-300 focus:ring-blue-400';
});

const displayHex = computed(() => {
  if (!props.register || !props.modelValue) return null;
  try {
    const val = parseValue(props.modelValue);
    return formatHex(val, props.register.width);
  } catch {
    return null;
  }
});

function onInput(e: Event) {
  const target = e.target as HTMLInputElement;
  emit('update:modelValue', target.value);
}
</script>
