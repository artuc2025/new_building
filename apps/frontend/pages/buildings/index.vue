
<script setup lang="ts">
import BuildingList from '~/components/buildings/BuildingList.vue';
import BuildingsMap from '~/components/buildings/BuildingsMap.vue';
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

const viewMode = ref<'list' | 'map'>('list');

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
            <div class="flex flex-col lg:flex-row gap-8">
                <!-- Sidebar Filters -->
                <aside class="w-full lg:w-72 flex-shrink-0">
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
                             <h1 class="text-3xl font-extrabold text-gray-900">{{ $t('buildings.title') }}</h1>
                             <p class="text-gray-500 mt-1" v-if="pagination">
                                {{ $t('buildings.showing_results', {
                                    from: (pagination.page - 1) * pagination.limit + 1,
                                    to: Math.min(pagination.page * pagination.limit, pagination.total),
                                    total: pagination.total
                                }) }}
                             </p>
                        </div>
                        
                        <div class="flex items-center gap-4">
                            <!-- List/Map Toggle -->
                            <div class="bg-white border border-gray-200 p-1 rounded-xl flex shadow-sm">
                                <button 
                                    @click="viewMode = 'list'"
                                    :class="['p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium', viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50']"
                                >
                                    <span class="i-heroicons-list-bullet w-5 h-5"></span>
                                    List
                                </button>
                                <button 
                                    @click="viewMode = 'map'"
                                    :class="['p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium', viewMode === 'map' ? 'bg-primary-50 text-primary-600' : 'text-gray-500 hover:bg-gray-50']"
                                >
                                    <span class="i-heroicons-map w-5 h-5"></span>
                                    Map
                                </button>
                            </div>

                            <SortDropdown v-model="currentSort" />
                        </div>
                    </div>

                    <!-- Error Alert -->
                    <div v-if="error" class="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-xl">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <span class="i-heroicons-exclamation-circle w-5 h-5 text-red-400"></span>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm text-red-700 font-medium">{{ error }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Listings / Map -->
                    <div v-if="viewMode === 'list'">
                        <BuildingList :buildings="buildings" :loading="loading" />

                        <!-- Pagination -->
                        <div class="mt-8 flex justify-center" v-if="pagination && pagination.totalPages > 1">
                            <Pagination 
                                :current-page="pagination.page" 
                                :total-pages="pagination.totalPages"
                                :has-next-page="pagination.hasNext"
                                :has-prev-page="pagination.hasPrev"
                                @page-change="goToPage"
                            />
                        </div>
                    </div>
                    
                    <div v-else>
                        <BuildingsMap :buildings="buildings" :loading="loading" />
                    </div>
                </main>
            </div>
        </div>
    </div>
</template>
