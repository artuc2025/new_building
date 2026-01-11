<script setup lang="ts">
import type { BuildingFilters } from '~/types/building';

interface Props {
  filters: BuildingFilters;
}

interface Emits {
  (e: 'update', filters: Partial<BuildingFilters>): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Local reactive state for form inputs
const localFilters = reactive<Partial<BuildingFilters>>({
  price_min: props.filters.price_min,
  price_max: props.filters.price_max,
  area_min: props.filters.area_min,
  area_max: props.filters.area_max,
  region_id: props.filters.region_id,
  developer_id: props.filters.developer_id,
  sort: props.filters.sort || 'date_desc',
});

// Watch for prop changes
watch(
  () => props.filters,
  (newFilters) => {
    localFilters.price_min = newFilters.price_min;
    localFilters.price_max = newFilters.price_max;
    localFilters.area_min = newFilters.area_min;
    localFilters.area_max = newFilters.area_max;
    localFilters.region_id = newFilters.region_id;
    localFilters.developer_id = newFilters.developer_id;
    localFilters.sort = newFilters.sort || 'date_desc';
  },
  { deep: true }
);

// Sort options
const sortOptions = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'area_asc', label: 'Area: Small to Large' },
  { value: 'area_desc', label: 'Area: Large to Small' },
];

// Mock regions (TODO: Fetch from /v1/regions API)
const regions = ref<Array<{ id: string; name: { am: string; ru: string; en: string } }>>([]);

// Mock developers (TODO: Fetch from /v1/developers API)
const developers = ref<Array<{ id: string; name: { am: string; ru: string; en: string } }>>([]);

// Get localized text helper
const getLocalizedText = (text: { am: string; ru: string; en: string }, locale: string = 'en'): string => {
  return text[locale as keyof typeof text] || text.en || text.am || text.ru || '';
};

const locale = 'en'; // TODO: Replace with useI18n().locale.value when i18n is set up

// Emit update when any filter changes
const updateFilter = (key: keyof BuildingFilters, value: any) => {
  localFilters[key] = value;
  emit('update', { [key]: value });
};

// Clear specific filter
const clearFilter = (key: keyof BuildingFilters) => {
  localFilters[key] = undefined;
  emit('update', { [key]: undefined });
};

// Reset all filters
const resetFilters = () => {
  localFilters.price_min = undefined;
  localFilters.price_max = undefined;
  localFilters.area_min = undefined;
  localFilters.area_max = undefined;
  localFilters.region_id = undefined;
  localFilters.developer_id = undefined;
  localFilters.sort = 'date_desc';
  emit('update', {
    price_min: undefined,
    price_max: undefined,
    area_min: undefined,
    area_max: undefined,
    region_id: undefined,
    developer_id: undefined,
    sort: 'date_desc',
  });
};
</script>

<template>
  <div class="building-filters bg-white rounded-lg shadow-md p-6">
    <div class="filters-header mb-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Filters</h2>
      <button
        @click="resetFilters"
        class="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        Reset All
      </button>
    </div>

    <!-- Sort Dropdown -->
    <div class="filter-group mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
      <select
        :value="localFilters.sort"
        @change="updateFilter('sort', ($event.target as HTMLSelectElement).value)"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option v-for="option in sortOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <!-- Price Range -->
    <div class="filter-group mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">Price Range (AMD/m²)</label>
      <div class="flex gap-2">
        <div class="flex-1">
          <input
            type="number"
            :value="localFilters.price_min"
            @input="updateFilter('price_min', ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : undefined)"
            placeholder="Min"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div class="flex-1">
          <input
            type="number"
            :value="localFilters.price_max"
            @input="updateFilter('price_max', ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : undefined)"
            placeholder="Max"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Area Range -->
    <div class="filter-group mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">Area Range (m²)</label>
      <div class="flex gap-2">
        <div class="flex-1">
          <input
            type="number"
            :value="localFilters.area_min"
            @input="updateFilter('area_min', ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : undefined)"
            placeholder="Min"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div class="flex-1">
          <input
            type="number"
            :value="localFilters.area_max"
            @input="updateFilter('area_max', ($event.target as HTMLInputElement).value ? Number(($event.target as HTMLInputElement).value) : undefined)"
            placeholder="Max"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>

    <!-- Region Select -->
    <div class="filter-group mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">Region</label>
      <select
        :value="localFilters.region_id"
        @change="updateFilter('region_id', ($event.target as HTMLSelectElement).value || undefined)"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">All Regions</option>
        <option v-for="region in regions" :key="region.id" :value="region.id">
          {{ getLocalizedText(region.name, locale) }}
        </option>
      </select>
      <p v-if="regions.length === 0" class="text-xs text-gray-500 mt-1">
        No regions available
      </p>
    </div>

    <!-- Developer Select -->
    <div class="filter-group mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">Developer</label>
      <select
        :value="localFilters.developer_id"
        @change="updateFilter('developer_id', ($event.target as HTMLSelectElement).value || undefined)"
        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">All Developers</option>
        <option v-for="developer in developers" :key="developer.id" :value="developer.id">
          {{ getLocalizedText(developer.name, locale) }}
        </option>
      </select>
      <p v-if="developers.length === 0" class="text-xs text-gray-500 mt-1">
        No developers available
      </p>
    </div>
  </div>
</template>

<style scoped>
.building-filters {
  position: sticky;
  top: 1rem;
}
</style>
