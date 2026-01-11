<script setup lang="ts">
import type { Building } from '~/types/building';

interface Props {
  buildings: Building[];
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
});
</script>

<template>
  <div class="building-list">
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <SkeletonLoader v-for="i in 8" :key="i" />
    </div>

    <div v-else-if="buildings.length === 0" class="text-center py-12">
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
      <h3 class="mt-2 text-sm font-medium text-gray-900">No buildings found</h3>
      <p class="mt-1 text-sm text-gray-500">
        Try adjusting your filters to see more results.
      </p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      <BuildingCard
        v-for="building in buildings"
        :key="building.id"
        :building="building"
      />
    </div>
  </div>
</template>

<style scoped>
/* Grid styles - using CSS Grid with responsive breakpoints */
.building-list {
  width: 100%;
}

@media (min-width: 640px) {
  .building-list {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1.5rem;
  }
}

@media (min-width: 768px) {
  .building-list {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .building-list {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .building-list {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
