<template>
  <div>
    <div
      @click="onClick"
      class="flex items-center px-2 py-1 cursor-pointer rounded text-sm select-none"
      :class="[
        isSelected ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100',
        isMatch ? 'font-semibold text-blue-600' : ''
      ]"
      :style="{ paddingLeft: (depth * 16 + 8) + 'px' }"
    >
      <span class="mr-1 w-4 text-center">
        <template v-if="node.type === 'directory'">
          {{ expanded ? '▼' : '▶' }}
        </template>
        <template v-else>
          ◆
        </template>
      </span>
      <span>{{ node.name }}</span>
    </div>
    <div v-if="expanded && node.children" class="border-l border-gray-200 ml-4">
      <TreeNodeItem
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :selected-path="selectedPath"
        :search-query="searchQuery"
        :auto-expand="autoExpand"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { TreeNode } from '@regdecoder/core';

const props = defineProps<{
  node: TreeNode;
  depth: number;
  selectedPath: string;
  searchQuery: string;
  autoExpand: Set<string>;
}>();

const emit = defineEmits<{
  select: [node: TreeNode];
}>();

const expanded = ref(false);

const isSelected = computed(() => props.selectedPath === props.node.path);
const isMatch = computed(() =>
  props.searchQuery && props.node.name.toLowerCase().includes(props.searchQuery.toLowerCase())
);

// Auto-expand when node path is in the autoExpand set
watch(() => props.autoExpand, (set) => {
  if (set.has(props.node.path)) {
    expanded.value = true;
  }
}, { immediate: true });

// Collapse all when search is cleared
watch(() => props.searchQuery, (q) => {
  if (!q.trim()) {
    expanded.value = false;
  }
});

function onClick() {
  if (props.node.type === 'directory') {
    expanded.value = !expanded.value;
  } else {
    emit('select', props.node);
  }
}
</script>
