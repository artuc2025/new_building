
import { storeToRefs } from 'pinia';
import { useBuildingsStore } from '~/stores/buildings';
import type { BuildingFilters } from '~/stores/buildings';

export const useBuildings = () => {
  const store = useBuildingsStore();
  const { buildings, loading, error, pagination, filters } = storeToRefs(store);
  const api = useApi();

  const fetchBuildings = async () => {
    store.setLoading(true);
    store.setError(null);

    try {
      const response = await api.api.listingsControllerFindAll({
        page: filters.value.page,
        limit: filters.value.limit,
        sort: filters.value.sort,
        currency: filters.value.currency,
        price_min: filters.value.price_min,
        price_max: filters.value.price_max,
        area_min: filters.value.area_min,
        area_max: filters.value.area_max,
        region_id: filters.value.region_id,
        developer_id: filters.value.developer_id,
        // Add other filters as they become available in UI
      });

      if (response.data.data && response.data.pagination) {
        store.setBuildings(response.data.data, response.data.pagination);
      }
    } catch (err: any) {
      console.error('Failed to fetch buildings:', err);
      store.setError(err.message || 'Failed to fetch buildings. Please try again.');
    } finally {
      store.setLoading(false);
    }
  };

  /**
   * Initial fetch if empty
   */
  const init = () => {
    if (!store.hasBuildings) {
      fetchBuildings();
    }
  };

  /**
   * Update filters and fetch immediately
   */
  const updateFilters = (newFilters: Partial<BuildingFilters>) => {
    store.setFilters(newFilters);
    // Reset page to 1 if filters change (except pagination)
    if (!newFilters.page) {
      store.setFilters({ page: 1 });
    }
    fetchBuildings();
  };

  /**
 * Go to specific page
 */
  const goToPage = (page: number) => {
    updateFilters({ page });
  };

  /**
   * Reset filters
   */
  const resetFilters = () => {
    store.resetFilters();
    fetchBuildings();
  };

  return {
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
  };
};
