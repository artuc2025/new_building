
<script setup lang="ts">
import type { BuildingFilters } from '~/stores/buildings';

const props = defineProps<{
    modelValue: BuildingFilters;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: BuildingFilters): void;
    (e: 'apply'): void;
    (e: 'reset'): void;
}>();

// Local state for filters to allow batch updates before applying
const localFilters = ref<BuildingFilters>({ ...props.modelValue });

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
    localFilters.value = { ...newVal };
}, { deep: true });

const applyFilters = () => {
    emit('update:modelValue', { ...localFilters.value });
    emit('apply');
};

const resetFilters = () => {
    localFilters.value = {
        page: 1,
        limit: 20,
        sort: props.modelValue.sort,
        currency: props.modelValue.currency,
    };
    emit('update:modelValue', localFilters.value);
    emit('reset');
};

// Simplified region options for MVP
const regionOptions = [
    { label: 'Kentron', value: 'kentron-uuid' },
    { label: 'Arabkir', value: 'arabkir-uuid' },
    { label: 'Davtashen', value: 'davtashen-uuid' },
];
</script>

<template>
    <div class="bg-white p-4 rounded-lg border border-gray-200 space-y-6">
        <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">{{ $t('buildings.filters.title') }}</h3>
            
            <!-- Currency Toggle -->
            <div class="flex items-center gap-2 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
                <button 
                    @click="localFilters.currency = 'AMD'; applyFilters()"
                    class="px-3 py-1 text-sm font-medium rounded-md transition-all"
                    :class="localFilters.currency === 'AMD' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'"
                >
                    AMD
                </button>
                <button 
                    @click="localFilters.currency = 'USD'; applyFilters()"
                    class="px-3 py-1 text-sm font-medium rounded-md transition-all"
                    :class="localFilters.currency === 'USD' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'"
                >
                    USD
                </button>
            </div>

            <div class="space-y-4">
                <!-- Price Range -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('buildings.filters.price_per_m2') }}</label>
                    <div class="grid grid-cols-2 gap-2">
                        <input
                            v-model.number="localFilters.price_min"
                            type="number"
                            :placeholder="$t('common.min')"
                            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        >
                        <input
                            v-model.number="localFilters.price_max"
                            type="number"
                            :placeholder="$t('common.max')"
                            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        >
                    </div>
                </div>

                <!-- Area Range -->
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">{{ $t('buildings.filters.area_m2') }}</label>
                    <div class="grid grid-cols-2 gap-2">
                        <input
                            v-model.number="localFilters.area_min"
                            type="number"
                            :placeholder="$t('common.min')"
                            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        >
                        <input
                            v-model.number="localFilters.area_max"
                            type="number"
                            :placeholder="$t('common.max')"
                            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        >
                    </div>
                </div>

                <!-- Region -->
                <!-- 
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Region</label>
                    <select
                        v-model="localFilters.region_id"
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                        <option value="">Any Region</option>
                        <option v-for="region in regionOptions" :key="region.value" :value="region.value">
                            {{ region.label }}
                        </option>
                    </select>
                </div> 
                -->
            </div>
        </div>

        <div class="pt-4 border-t border-gray-200 flex gap-2">
            <button
                @click="applyFilters"
                class="flex-1 bg-primary-600 text-white px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
                {{ $t('common.apply') }}
            </button>
            <button
                @click="resetFilters"
                class="flex-1 bg-white text-gray-700 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
                {{ $t('common.reset') }}
            </button>
        </div>
    </div>
</template>
