
<script setup lang="ts">
const props = defineProps<{
  priceMin?: number;
  priceMax?: number;
  currency: string;
  areaMin: number;
  areaMax: number;
}>();

const locale = 'en'; // Should come from i18n

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: props.currency,
    maximumFractionDigits: 0
  }).format(val);
};

const totalPriceMin = computed(() => (props.priceMin || 0) * props.areaMin);
const totalPriceMax = computed(() => (props.priceMax || props.priceMin || 0) * props.areaMax);
</script>

<template>
  <div class="space-y-4">
    <div class="p-6 bg-primary-50 rounded-2xl border border-primary-100">
      <h3 class="text-sm font-medium text-primary-600 mb-2 uppercase tracking-wider">Price per m²</h3>
      <div class="flex items-baseline gap-2">
        <span class="text-3xl font-bold text-gray-900">{{ formatCurrency(priceMin || 0) }}</span>
        <span v-if="priceMax" class="text-xl text-gray-500">— {{ formatCurrency(priceMax) }}</span>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <h3 class="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Estimated Total</h3>
        <p class="text-lg font-semibold text-gray-900">
          from {{ formatCurrency(totalPriceMin) }}
        </p>
      </div>
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <h3 class="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Area Range</h3>
        <p class="text-lg font-semibold text-gray-900">
          {{ areaMin }} — {{ areaMax }} m²
        </p>
      </div>
    </div>
  </div>
</template>
