import { defineStore } from 'pinia';
import type { BuildingResponseDto, PaginationMetaDto } from '~/api/client';

export interface BuildingFilters {
  price_min?: number;
  price_max?: number;
  area_min?: number;
  area_max?: number;
  region_id?: string;
  developer_id?: string;
  sort?: 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'area_asc' | 'area_desc';
  page?: number;
  limit?: number;
  currency?: 'AMD' | 'USD';
}

interface BuildingsState {
  buildings: BuildingResponseDto[];
  loading: boolean;
  error: string | null;
  pagination: PaginationMetaDto | null;
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
      currency: 'AMD',
    },
  }),

  getters: {
    hasBuildings: (state): boolean => state.buildings.length > 0,
    hasNextPage: (state): boolean => {
      if (!state.pagination) return false;
      return state.pagination.hasNext;
    },
    hasPrevPage: (state): boolean => {
      if (!state.pagination) return false;
      return state.pagination.hasPrev;
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
        currency: 'AMD',
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
    setBuildings(buildings: BuildingResponseDto[], pagination: PaginationMetaDto) {
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
