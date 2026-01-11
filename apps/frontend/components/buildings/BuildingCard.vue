<script setup lang="ts">
import type { Building } from '~/types/building';

interface Props {
  building: Building;
}

const props = defineProps<Props>();

/**
 * Get localized text from multi-language object
 */
const getLocalizedText = (text: { am: string; ru: string; en: string }, locale: string = 'en'): string => {
  return text[locale as keyof typeof text] || text.en || text.am || text.ru || '';
};

/**
 * Format price range nicely
 */
const formatPriceRange = (min: number, max: number): string => {
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num);
  };
  
  if (min === max) {
    return `${formatNumber(min)} AMD/m²`;
  }
  return `${formatNumber(min)} - ${formatNumber(max)} AMD/m²`;
};

/**
 * Format area range
 */
const formatAreaRange = (min: number, max: number): string => {
  if (min === max) {
    return `${min} m²`;
  }
  return `${min} - ${max} m²`;
};

// Get current locale (default to 'en' for now, can be enhanced with i18n)
const locale = 'en'; // TODO: Replace with useI18n().locale.value when i18n is set up

const title = computed(() => getLocalizedText(props.building.title, locale));
const address = computed(() => getLocalizedText(props.building.address, locale));
const developerName = computed(() => getLocalizedText(props.building.developer.name, locale));
const priceRange = computed(() => formatPriceRange(props.building.pricePerM2Min, props.building.pricePerM2Max));
const areaRange = computed(() => formatAreaRange(props.building.areaMin, props.building.areaMax));

const handleCardClick = () => {
  navigateTo(`/buildings/${props.building.id}`);
};
</script>

<template>
  <div
    class="building-card bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
    @click="handleCardClick"
  >
    <!-- Image -->
    <div class="building-card__image relative h-48 bg-gray-200 overflow-hidden">
      <NuxtImg
        v-if="building.primaryImage?.thumbnailUrl"
        :src="building.primaryImage.thumbnailUrl"
        :alt="title"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-gray-300">
        <svg
          class="w-16 h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      </div>
    </div>

    <!-- Content -->
    <div class="building-card__content p-4">
      <!-- Title -->
      <h3 class="building-card__title text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
        {{ title }}
      </h3>

      <!-- Address -->
      <p class="building-card__address text-sm text-gray-600 mb-3 line-clamp-1">
        {{ address }}
      </p>

      <!-- Price Range -->
      <div class="building-card__price mb-2">
        <span class="text-base font-bold text-blue-600">{{ priceRange }}</span>
      </div>

      <!-- Area Range -->
      <div class="building-card__area mb-2">
        <span class="text-sm text-gray-700">Area: {{ areaRange }}</span>
      </div>

      <!-- Developer -->
      <div class="building-card__developer text-sm text-gray-600">
        <span class="font-medium">Developer:</span>
        <span class="ml-1">{{ developerName }}</span>
      </div>

      <!-- Additional Info -->
      <div class="building-card__meta mt-3 pt-3 border-t border-gray-200 flex justify-between text-xs text-gray-500">
        <span>{{ building.floors }} {{ building.floors === 1 ? 'floor' : 'floors' }}</span>
        <span v-if="building.commissioningDate">
          {{ new Date(building.commissioningDate).getFullYear() }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.building-card {
  transition: transform 0.2s ease;
}

.building-card:hover {
  transform: translateY(-2px);
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
