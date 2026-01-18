
<script setup lang="ts">
import BuildingList from '~/components/buildings/BuildingList.vue';
import FilterPanel from '~/components/buildings/FilterPanel.vue';
import SortDropdown from '~/components/buildings/SortDropdown.vue';
import Pagination from '~/components/common/Pagination.vue'; 
import { useBuildings } from '~/composables/useBuildings';

const { 
    buildings, 
    loading, 
    error, 
    pagination, 
    filters,
    fetchBuildings, 
    updateFilters, 
    goToPage,
    resetFilters,
    init 
} = useBuildings();

// Local state for sort to bind with SortDropdown
const currentSort = computed({
    get: () => filters.value.sort || 'date_desc',
    set: (val: string) => updateFilters({ sort: val as any })
});

// Fetch on mount
onMounted(() => {
    init();
});
</script>

<template>
    <div class="bg-gray-50 min-h-screen pb-12">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="flex flex-col md:flex-row gap-8">
                <!-- Sidebar Filters -->
                <aside class="w-full md:w-64 flex-shrink-0">
                    <div class="sticky top-4">
                        <FilterPanel 
                            :modelValue="filters" 
                            @update:modelValue="updateFilters"
                            @reset="resetFilters"
                        />
                    </div>
                </aside>

                <!-- Main Content -->
                <main class="flex-1">
                    <!-- Header & Sort -->
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                             <h1 class="text-2xl font-bold text-gray-900">New Buildings</h1>
                             <p class="text-gray-500 mt-1" v-if="pagination">
                                Showing {{ (pagination.page - 1) * pagination.limit + 1 }} - 
                                {{ Math.min(pagination.page * pagination.limit, pagination.total) }} 
                                of {{ pagination.total }} results
                             </p>
                        </div>
                        
                        <SortDropdown v-model="currentSort" />
                    </div>

                    <!-- Error Alert -->
                    <div v-if="error" class="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <span class="i-heroicons-exclamation-circle w-5 h-5 text-red-400"></span>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm text-red-700">{{ error }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Listings -->
                    <BuildingList :buildings="buildings" :loading="loading" />

                    <!-- Pagination -->
                    <!-- Only show if total pages > 1 -->
                    <div class="mt-8 flex justify-center" v-if="pagination && pagination.totalPages > 1">
                        <Pagination 
                            :current-page="pagination.page" 
                            :total-pages="pagination.totalPages"
                            :has-next-page="pagination.hasNext"
                            :has-prev-page="pagination.hasPrev"
                            @page-change="goToPage"
                        />
                    </div>
                </main>
            </div>
        </div>
    </div>
</template>
