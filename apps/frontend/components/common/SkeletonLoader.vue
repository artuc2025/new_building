<script setup lang="ts">
interface Props {
  count?: number;
}

withDefaults(defineProps<Props>(), {
  count: 1,
});
</script>

<template>
  <div v-for="i in count" :key="i" class="skeleton-card bg-white rounded-lg shadow-md overflow-hidden">
    <!-- Image skeleton -->
    <div class="skeleton-image h-48 bg-gray-200 animate-pulse" />

    <!-- Content skeleton -->
    <div class="skeleton-content p-4">
      <!-- Title skeleton -->
      <div class="skeleton-title h-6 bg-gray-200 rounded mb-3 animate-pulse" />

      <!-- Address skeleton -->
      <div class="skeleton-address h-4 bg-gray-200 rounded mb-4 w-3/4 animate-pulse" />

      <!-- Price skeleton -->
      <div class="skeleton-price h-5 bg-gray-200 rounded mb-2 w-1/2 animate-pulse" />

      <!-- Area skeleton -->
      <div class="skeleton-area h-4 bg-gray-200 rounded mb-2 w-2/3 animate-pulse" />

      <!-- Developer skeleton -->
      <div class="skeleton-developer h-4 bg-gray-200 rounded mb-3 w-1/2 animate-pulse" />

      <!-- Meta skeleton -->
      <div class="skeleton-meta mt-3 pt-3 border-t border-gray-200 flex justify-between">
        <div class="h-3 bg-gray-200 rounded w-16 animate-pulse" />
        <div class="h-3 bg-gray-200 rounded w-12 animate-pulse" />
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
