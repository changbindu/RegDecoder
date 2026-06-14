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
        v-for="node in tree"
        :key="node.path"
        :node="node"
        :depth="0"
        :selected-path="selectedPath"
        :search-query="searchQuery"
        :auto-expand="expandedPaths"
        @select="onSelect"
      />
      <p v-if="hasSearch && !hasMatch" class="text-gray-400 text-sm p-2">
        No registers found
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
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

// Collect all matching node paths (files and directories) for a query
function collectMatches(nodes: TreeNode[], query: string): string[] {
  const results: string[] = [];
  for (const node of nodes) {
    if (node.name.toLowerCase().includes(query)) {
      results.push(node.path);
    }
    if (node.children) {
      results.push(...collectMatches(node.children, query));
    }
  }
  return results;
}

// Compute which directories should auto-expand: ancestors of matching nodes + matching dirs
const expandedPaths = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return new Set<string>();
  const matches = collectMatches(props.tree, q);
  const toExpand = new Set<string>();
  for (const matchPath of matches) {
    const parts = matchPath.split('/');
    for (let i = 0; i < parts.length - 1; i++) {
      toExpand.add(parts.slice(0, i + 1).join('/'));
    }
    // Also expand matching directories themselves if they have children
    const node = findNode(props.tree, matchPath);
    if (node && node.type === 'directory') {
      toExpand.add(matchPath);
    }
  }
  return toExpand;
});

const hasSearch = computed(() => searchQuery.value.trim().length > 0);
const hasMatch = computed(() => {
  const q = searchQuery.value.toLowerCase().trim();
  if (!q) return true;
  return collectMatches(props.tree, q).length > 0;
});

function findNode(nodes: TreeNode[], path: string): TreeNode | null {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findNode(node.children, path);
      if (found) return found;
    }
  }
  return null;
}

function collectFileMatches(nodes: TreeNode[], query: string): string[] {
  const results: string[] = [];
  for (const node of nodes) {
    if (node.type === 'file' && node.name.toLowerCase().includes(query)) {
      results.push(node.path);
    }
    if (node.children) {
      results.push(...collectFileMatches(node.children, query));
    }
  }
  return results;
}

// Auto-select when search yields exactly one file match
watch(searchQuery, (q) => {
  const query = q.toLowerCase().trim();
  if (!query) return;
  const matches = collectFileMatches(props.tree, query);
  if (matches.length === 1 && matches[0] !== selectedPath.value) {
    selectedPath.value = matches[0];
    const content = findDefinitionContent(props.definitions, matches[0]);
    if (content) {
      try {
        const reg = parseRegister(content);
        emit('select', reg, matches[0]);
      } catch (e) {
        console.error('Failed to parse register:', e);
      }
    }
  }
});

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
