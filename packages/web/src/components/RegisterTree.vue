<template>
  <div class="flex flex-col h-full">
    <div class="p-2">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search registers..."
        class="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
    <div class="flex-1 overflow-y-auto px-2 pb-2">
      <TreeNodeItem
        v-for="node in filteredTree"
        :key="node.path"
        :node="node"
        :depth="0"
        :selected-path="selectedPath"
        :search-query="searchQuery"
        @select="onSelect"
      />
      <p v-if="filteredTree.length === 0" class="text-gray-400 text-sm p-2">
        No registers found
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { TreeNode, Register } from '@regdecoder/core';
import { parseRegister } from '@regdecoder/core';
import TreeNodeItem from './TreeNodeItem.vue';

const props = defineProps<{
  tree: TreeNode[];
  definitions: Record<string, string>;
}>();

const emit = defineEmits<{
  select: [register: Register, path: string];
}>();

const searchQuery = ref('');
const selectedPath = ref('');

// Filter tree nodes by search query (case-insensitive substring)
const filteredTree = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return props.tree;
  return filterNodes(props.tree, q);
});

function filterNodes(nodes: TreeNode[], query: string): TreeNode[] {
  const results: TreeNode[] = [];
  for (const node of nodes) {
    const nameMatch = node.name.toLowerCase().includes(query);
    const filteredChildren = node.children ? filterNodes(node.children, query) : [];

    if (nameMatch || filteredChildren.length > 0) {
      results.push({
        ...node,
        children: nameMatch ? node.children : filteredChildren,
      });
    }
  }
  return results;
}

function findDefinitionContent(definitions: Record<string, string>, nodePath: string): string | undefined {
  for (const [key, value] of Object.entries(definitions)) {
    if (key.endsWith(`/${nodePath}.jsonc`)) return value;
  }
}

function onSelect(node: TreeNode) {
  if (node.type === 'file') {
    selectedPath.value = node.path;
    const content = findDefinitionContent(props.definitions, node.path);
    if (content) {
      try {
        const reg = parseRegister(content);
        emit('select', reg, node.path);
      } catch (e) {
        console.error('Failed to parse register:', e);
      }
    }
  }
}
</script>
