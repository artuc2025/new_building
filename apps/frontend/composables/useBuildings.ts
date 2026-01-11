import { useRuntimeConfig } from 'nuxt/app';
import { useBuildingsStore } from '~/stores/buildings';
import type { BuildingFilters, BuildingsResponse, Building } from '~/types/building';

/**
 * Composable for managing building listings
 * Provides reactive state, filters, and API integration
 */
export const useBuildings = () => {
  const store = useBuildingsStore();
  const config = useRuntimeConfig();

  // Expose reactive state from store
  const buildings = computed(() => store.buildings);
  const loading = computed(() => store.loading);
  const error = computed(() => store.error);
  const pagination = computed(() => store.pagination);
  const filters = computed(() => store.filters);

  // Debounce timer for filter updates
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Build query parameters from filters
   */
  const buildQueryParams = (filters: BuildingFilters): Record<string, string | number> => {
    const params: Record<string, string | number> = {};

    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.sort) params.sort = filters.sort;
    if (filters.price_min !== undefined) params.price_min = filters.price_min;
    if (filters.price_max !== undefined) params.price_max = filters.price_max;
    if (filters.area_min !== undefined) params.area_min = filters.area_min;
    if (filters.area_max !== undefined) params.area_max = filters.area_max;
    if (filters.region_id) params.region_id = filters.region_id;
    if (filters.developer_id) params.developer_id = filters.developer_id;

    return params;
  };

  /**
   * Fetch buildings from API
   */
  const fetchBuildings = async (customFilters?: Partial<BuildingFilters>): Promise<void> => {
    // Merge custom filters with store filters
    const activeFilters = customFilters ? { ...store.filters, ...customFilters } : store.filters;

    store.setLoading(true);
    store.setError(null);

    try {
      const queryParams = buildQueryParams(activeFilters);
      const queryString = new URLSearchParams(
        Object.entries(queryParams).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>)
      ).toString();

      const apiUrl = `${config.public.apiBaseUrl}/v1/buildings${queryString ? `?${queryString}` : ''}`;

      const response = await $fetch<BuildingsResponse>(apiUrl);

      // Transform response if API returns developerId/regionId instead of nested objects
      // This handles the case where backend returns IDs but we need enriched objects
      const transformedBuildings = response.data.map((building: any): Building => {
        // If building has developerId/regionId instead of developer/region objects,
        // we'll need to fetch or transform them. For now, assume API returns enriched structure.
        // If transformation is needed, it can be added here or in a separate transformation function.
        return building as Building;
      });

      store.setBuildings(transformedBuildings, response.pagination);
    } catch (err: any) {
      const errorMessage = err?.data?.message || err?.message || 'Failed to fetch buildings';
      store.setError(errorMessage);
      store.setBuildings([], {
        page: 1,
        limit: activeFilters.limit || 20,
        total: 0,
        totalPages: 0,
      });
      console.error('Error fetching buildings:', err);
    } finally {
      store.setLoading(false);
    }
  };

  /**
   * Update filters with debouncing to avoid API spamming
   * @param newFilters - Partial filter object to update
   * @param debounceMs - Debounce delay in milliseconds (default: 500ms)
   */
  const debouncedUpdateFilters = (
    newFilters: Partial<BuildingFilters>,
    debounceMs: number = 500
  ): void => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Update filters immediately in store (for UI reactivity)
    store.setFilters(newFilters);

    // Debounce the API call
    debounceTimer = setTimeout(() => {
      // Reset to page 1 when filters change (except when page is explicitly set)
      const filtersToApply = { ...newFilters };
      if (!newFilters.page) {
        filtersToApply.page = 1;
        store.setFilters({ page: 1 });
      }

      fetchBuildings(filtersToApply);
    }, debounceMs);
  };

  /**
   * Update filters and fetch immediately (no debounce)
   */
  const updateFilters = (newFilters: Partial<BuildingFilters>): void => {
    store.setFilters(newFilters);
    fetchBuildings(newFilters);
  };

  /**
   * Go to a specific page
   */
  const goToPage = (page: number): void => {
    updateFilters({ page });
  };

  /**
   * Reset all filters to defaults
   */
  const resetFilters = (): void => {
    store.resetFilters();
    fetchBuildings();
  };

  return {
    // State
    buildings,
    loading,
    error,
    pagination,
    filters,

    // Getters (from store)
    hasBuildings: computed(() => store.hasBuildings),
    hasNextPage: computed(() => store.hasNextPage),
    hasPrevPage: computed(() => store.hasPrevPage),
    currentPage: computed(() => store.currentPage),
    totalPages: computed(() => store.totalPages),
    totalItems: computed(() => store.totalItems),

    // Actions
    fetchBuildings,
    debouncedUpdateFilters,
    updateFilters,
    goToPage,
    resetFilters,
  };
};
