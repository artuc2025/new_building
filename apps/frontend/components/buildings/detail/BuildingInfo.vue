
<script setup lang="ts">
const props = defineProps<{
  floors: number;
  totalUnits?: number;
  commissioningDate?: string;
  status?: string;
  constructionStatus?: string;
}>();

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });
};

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-700';
    case 'under_construction': return 'bg-blue-100 text-blue-700';
    case 'planned': return 'bg-amber-100 text-amber-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 bg-gray-50 rounded-2xl">
    <div class="space-y-1">
      <p class="text-xs text-gray-500 uppercase font-medium">Floors</p>
      <div class="flex items-center gap-2">
        <span class="i-heroicons-layers w-5 h-5 text-primary-500"></span>
        <p class="text-lg font-bold text-gray-900">{{ floors }}</p>
      </div>
    </div>

    <div class="space-y-1" v-if="totalUnits">
      <p class="text-xs text-gray-500 uppercase font-medium">Total Units</p>
      <div class="flex items-center gap-2">
        <span class="i-heroicons-home w-5 h-5 text-primary-500"></span>
        <p class="text-lg font-bold text-gray-900">{{ totalUnits }}</p>
      </div>
    </div>

    <div class="space-y-1">
      <p class="text-xs text-gray-500 uppercase font-medium">Completion</p>
      <div class="flex items-center gap-2">
        <span class="i-heroicons-calendar w-5 h-5 text-primary-500"></span>
        <p class="text-base font-bold text-gray-900">{{ formatDate(commissioningDate) }}</p>
      </div>
    </div>

    <div class="space-y-1">
      <p class="text-xs text-gray-500 uppercase font-medium">Status</p>
      <div class="pt-1">
        <span :class="['px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider', getStatusColor(constructionStatus)]">
          {{ constructionStatus?.replace('_', ' ') || 'Unknown' }}
        </span>
      </div>
    </div>
  </div>
</template>
