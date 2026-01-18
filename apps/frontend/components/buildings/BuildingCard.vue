
<script setup lang="ts">
import type { BuildingResponseDto } from '~/api/client';

const props = defineProps<{
    building: BuildingResponseDto;
}>();

const locale = 'am'; // Hardcoded for MVP, will use useI18n later

// Hepler to safe get localized string
const getLocalizedValue = (obj: any) => {
    return obj?.[locale] || Object.values(obj || {})[0] || '';
};

const title = computed(() => getLocalizedValue(props.building.title));
const address = computed(() => getLocalizedValue(props.building.address));
const formatPrice = (price: number) => {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: props.building.currency || 'AMD' }).format(price);
};

</script>

<template>
    <div class="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <!-- Image -->
        <div class="aspect-w-16 aspect-h-9 bg-gray-200 group-hover:opacity-90 transition-opacity overflow-hidden h-48">
            <div class="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                <span class="i-heroicons-photo w-12 h-12"></span>
            </div>
        </div>

        <!-- Content -->
        <div class="p-4">
            <h3 class="text-lg font-semibold text-gray-900 truncate" :title="title">
                {{ title }}
            </h3>
            
            <p class="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <span class="i-heroicons-map-pin w-4 h-4"></span>
                {{ address }}
            </p>

            <div class="mt-4 flex items-baseline justify-between">
                <div>
                     <p class="text-xs text-gray-500">Price per m²</p>
                     <p class="text-base font-medium text-primary-600">
                        {{ formatPrice(Number(building.pricePerM2Min) || 0) }} 
                        <span v-if="building.pricePerM2Max"> - {{ formatPrice(Number(building.pricePerM2Max) || 0) }}</span>
                     </p>
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-500">Area</p>
                    <p class="text-sm font-medium text-gray-900">
                        {{ building.areaMin }} - {{ building.areaMax }} m²
                    </p>
                </div>
            </div>

             <div class="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                 <span>{{ building.floors }} Floors</span>
                 <span>Completed: {{ building.commissioningDate ? new Date(building.commissioningDate as string).getFullYear() : 'N/A' }}</span>
             </div>
        </div>
        
        <!-- Link overlay -->
        <NuxtLink :to="`/buildings/${building.id}`" class="absolute inset-0">
            <span class="sr-only">View details for {{ title }}</span>
        </NuxtLink>
    </div>
</template>
