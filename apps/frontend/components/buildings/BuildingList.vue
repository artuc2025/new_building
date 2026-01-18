
<script setup lang="ts">
import BuildingCard from './BuildingCard.vue';
import type { BuildingResponseDto } from '~/api/client';

defineProps<{
    buildings: BuildingResponseDto[];
    loading?: boolean;
}>();
</script>

<template>
    <div>
        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="i in 6" :key="i" class="animate-pulse bg-white rounded-lg border border-gray-200 overflow-hidden h-96">
                <div class="h-48 bg-gray-200"></div>
                <div class="p-4 space-y-4">
                    <div class="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                    <div class="h-10 bg-gray-200 rounded w-full"></div>
                </div>
            </div>
        </div>

        <div v-else-if="buildings.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <BuildingCard 
                v-for="building in buildings" 
                :key="building.id" 
                :building="building" 
            />
        </div>

        <div v-else class="text-center py-12">
            <span class="i-heroicons-home-modern w-16 h-16 text-gray-300 mx-auto mb-4 block"></span>
            <h3 class="text-lg font-medium text-gray-900">No buildings found</h3>
            <p class="text-gray-500 mt-2">Try adjusting your filters or search criteria</p>
        </div>
    </div>
</template>
