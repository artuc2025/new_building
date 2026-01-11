import { defineStore } from 'pinia';
import type { Building, BuildingFilters, PaginationMeta } from '~/types/building';

interface BuildingsState {
  buildings: Building[];
  loading: boolean;
  error: string | null;
  pagination: PaginationMeta | null;
  filters: BuildingFilters;
}

export const useBuildingsStore = defineStore('buildings', {
  state: (): BuildingsState => ({
    buildings: [],
    loading: false,
    error: null,
    pagination: null,
    filters: {
      page: 1,
      limit: 20,
      sort: 'date_desc',
    },
  }),

  getters: {
    hasBuildings: (state): boolean => state.buildings.length > 0,
    hasNextPage: (state): boolean => {
      if (!state.pagination) return false;
      return state.pagination.page < state.pagination.totalPages;
    },
    hasPrevPage: (state): boolean => {
      if (!state.pagination) return false;
      return state.pagination.page > 1;
    },
    currentPage: (state): number => state.filters.page || 1,
    totalPages: (state): number => state.pagination?.totalPages || 0,
    totalItems: (state): number => state.pagination?.total || 0,
  },

  actions: {
    /**
     * Set filters for building search
     */
    setFilters(filters: Partial<BuildingFilters>) {
      this.filters = { ...this.filters, ...filters };
    },

    /**
     * Reset filters to default values
     */
    resetFilters() {
      this.filters = {
        page: 1,
        limit: 20,
        sort: 'date_desc',
      };
    },

    /**
     * Set loading state
     */
    setLoading(loading: boolean) {
      this.loading = loading;
    },

    /**
     * Set error state
     */
    setError(error: string | null) {
      this.error = error;
    },

    /**
     * Set buildings data and pagination
     */
    setBuildings(buildings: Building[], pagination: PaginationMeta) {
      this.buildings = buildings;
      this.pagination = pagination;
    },

    /**
     * Clear all buildings data
     */
    clearBuildings() {
      this.buildings = [];
      this.pagination = null;
      this.error = null;
    },
  },
});
