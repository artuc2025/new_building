<script setup lang="ts">
import type { BuildingFilters } from '~/types/building';

// Get route and router for URL syncing
const route = useRoute();
const router = useRouter();

// Use buildings composable
const {
  buildings,
  loading,
  error,
  pagination,
  filters,
  hasBuildings,
  hasNextPage,
  hasPrevPage,
  currentPage,
  totalPages,
  fetchBuildings,
  debouncedUpdateFilters,
  updateFilters,
  goToPage,
} = useBuildings();

// Mobile drawer state
const showFiltersDrawer = ref(false);

/**
 * Parse query parameters from URL
 */
const parseQueryParams = (): Partial<BuildingFilters> => {
  const query = route.query;
  const params: Partial<BuildingFilters> = {};

  if (query.page) {
    const page = Number(query.page);
    if (!isNaN(page) && page > 0) params.page = page;
  }

  if (query.limit) {
    const limit = Number(query.limit);
    if (!isNaN(limit) && limit > 0) params.limit = limit;
  }

  if (query.sort && typeof query.sort === 'string') {
    params.sort = query.sort;
  }

  if (query.price_min) {
    const priceMin = Number(query.price_min);
    if (!isNaN(priceMin)) params.price_min = priceMin;
  }

  if (query.price_max) {
    const priceMax = Number(query.price_max);
    if (!isNaN(priceMax)) params.price_max = priceMax;
  }

  if (query.area_min) {
    const areaMin = Number(query.area_min);
    if (!isNaN(areaMin)) params.area_min = areaMin;
  }

  if (query.area_max) {
    const areaMax = Number(query.area_max);
    if (!isNaN(areaMax)) params.area_max = areaMax;
  }

  if (query.region_id && typeof query.region_id === 'string') {
    params.region_id = query.region_id;
  }

  if (query.developer_id && typeof query.developer_id === 'string') {
    params.developer_id = query.developer_id;
  }

  return params;
};

/**
 * Update URL query parameters from filters
 */
const updateURL = (newFilters: Partial<BuildingFilters>) => {
  const query: Record<string, string> = {};

  // Only add non-default values to URL
  if (newFilters.page && newFilters.page > 1) {
    query.page = String(newFilters.page);
  }

  if (newFilters.limit && newFilters.limit !== 20) {
    query.limit = String(newFilters.limit);
  }

  if (newFilters.sort && newFilters.sort !== 'date_desc') {
    query.sort = newFilters.sort;
  }

  if (newFilters.price_min !== undefined) {
    query.price_min = String(newFilters.price_min);
  }

  if (newFilters.price_max !== undefined) {
    query.price_max = String(newFilters.price_max);
  }

  if (newFilters.area_min !== undefined) {
    query.area_min = String(newFilters.area_min);
  }

  if (newFilters.area_max !== undefined) {
    query.area_max = String(newFilters.area_max);
  }

  if (newFilters.region_id) {
    query.region_id = newFilters.region_id;
  }

  if (newFilters.developer_id) {
    query.developer_id = newFilters.developer_id;
  }

  // Update URL without triggering navigation
  router.replace({
    query,
  });
};

/**
 * Handle filter updates from BuildingFilters component
 */
const handleFilterUpdate = (newFilters: Partial<BuildingFilters>) => {
  // Merge with existing filters
  const updatedFilters = { ...filters.value, ...newFilters };
  
  // Update URL immediately for instant feedback
  updateURL(updatedFilters);
  
  // Update filters with debouncing (for price/area sliders)
  // This will update the store and fetch data
  debouncedUpdateFilters(newFilters);
};

/**
 * Handle page change from Pagination component
 */
const handlePageChange = (page: number) => {
  const updatedFilters = { ...filters.value, page };
  updateURL(updatedFilters);
  goToPage(page);
};

/**
 * Initialize filters from URL on mount
 */
onMounted(() => {
  const urlParams = parseQueryParams();
  
  if (Object.keys(urlParams).length > 0) {
    // Update filters from URL
    updateFilters(urlParams);
  } else {
    // Fetch with default filters
    fetchBuildings();
  }
});

/**
 * Watch for route query changes (e.g., browser back/forward)
 */
watch(
  () => route.query,
  (newQuery, oldQuery) => {
    // Skip if this is the initial mount (handled in onMounted)
    if (!oldQuery || Object.keys(oldQuery).length === 0) {
      return;
    }

    // Only update if query actually changed (avoid infinite loops)
    const urlParams = parseQueryParams();
    const currentFilters = filters.value;
    
    // Check if URL params differ from current filters
    const hasChanges = 
      urlParams.page !== currentFilters.page ||
      urlParams.limit !== currentFilters.limit ||
      urlParams.sort !== currentFilters.sort ||
      urlParams.price_min !== currentFilters.price_min ||
      urlParams.price_max !== currentFilters.price_max ||
      urlParams.area_min !== currentFilters.area_min ||
      urlParams.area_max !== currentFilters.area_max ||
      urlParams.region_id !== currentFilters.region_id ||
      urlParams.developer_id !== currentFilters.developer_id;

    if (hasChanges) {
      // Update filters and fetch (no debounce needed for URL navigation)
      updateFilters(urlParams);
    }
  },
  { deep: true }
);

// Set page meta
useHead({
  title: 'Buildings - Real Estate Portal',
  meta: [
    {
      name: 'description',
      content: 'Browse available buildings and residential complexes',
    },
  ],
});
</script>

<template>
  <div class="buildings-page min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Buildings</h1>
        <p class="text-gray-600">
          {{ pagination?.total || 0 }} {{ pagination?.total === 1 ? 'building' : 'buildings' }} found
        </p>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
        <p class="text-red-800">{{ error }}</p>
      </div>

      <!-- Main Content Layout -->
      <div class="flex flex-col lg:flex-row gap-6">
        <!-- Filters Sidebar (Desktop) -->
        <aside class="hidden lg:block lg:w-80 flex-shrink-0">
          <BuildingFilters :filters="filters" @update="handleFilterUpdate" />
        </aside>

        <!-- Filters Drawer (Mobile) -->
        <div
          v-if="showFiltersDrawer"
          class="fixed inset-0 z-50 lg:hidden"
          @click="showFiltersDrawer = false"
        >
          <div class="fixed inset-y-0 left-0 w-80 bg-white shadow-xl overflow-y-auto z-50">
            <div class="p-4">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">Filters</h2>
                <button
                  @click="showFiltersDrawer = false"
                  class="p-2 hover:bg-gray-100 rounded-md"
                  aria-label="Close filters"
                >
                  <svg
                    class="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <BuildingFilters :filters="filters" @update="handleFilterUpdate" />
            </div>
          </div>
        </div>

        <!-- Main Content Area -->
        <main class="flex-1 min-w-0">
          <!-- Mobile Filter Toggle -->
          <div class="lg:hidden mb-4">
            <button
              @click="showFiltersDrawer = true"
              class="w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 flex items-center justify-between"
            >
              <span class="font-medium text-gray-700">Filters</span>
              <svg
                class="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
            </button>
          </div>

          <!-- Building List -->
          <BuildingList :buildings="buildings" :loading="loading" />

          <!-- Pagination -->
          <div v-if="!loading && pagination && totalPages > 1" class="mt-8">
            <Pagination
              :current-page="currentPage"
              :total-pages="totalPages"
              :has-next-page="hasNextPage"
              :has-prev-page="hasPrevPage"
              @page-change="handlePageChange"
            />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  max-width: 1280px;
  margin: 0 auto;
}

/* Responsive adjustments */
@media (max-width: 1023px) {
  .buildings-page {
    padding-bottom: 2rem;
  }
}
</style>
