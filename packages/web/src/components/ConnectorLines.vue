<template>
  <svg class="absolute inset-0 pointer-events-none" style="z-index: 1;">
    <path
      v-for="(line, idx) in lines"
      :key="idx"
      :d="line.path"
      :stroke="line.color"
      stroke-width="1.5"
      fill="none"
      opacity="0.5"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  lines: Array<{ path: string; color: string }>;
}>();
</script>

<!-- Note: Connectors rendered as an overlay by parent. The parent computes line positions. -->
<!-- Simplified for v1: rendered as decorative element, positions calculated in App.vue. -->
