
<script setup lang="ts">
const props = defineProps<{
  websiteUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  developerName: string;
}>();
</script>

<template>
  <div class="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
    <h3 class="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
      <span class="i-heroicons-user-group w-6 h-6 text-primary-500"></span>
      Developer Information
    </h3>
    
    <p class="text-sm font-medium text-gray-500 mb-1">Developer</p>
    <p class="text-xl font-bold text-gray-900 mb-6">{{ developerName }}</p>

    <div class="space-y-4">
      <a v-if="websiteUrl" :href="websiteUrl" target="_blank" class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-primary-50 hover:border-primary-100 transition-all group">
        <span class="i-heroicons-globe-alt w-5 h-5 text-gray-400 group-hover:text-primary-500"></span>
        <span class="text-sm font-medium text-gray-700">Official Website</span>
        <span class="i-heroicons-arrow-top-right-on-square w-4 h-4 ml-auto text-gray-300"></span>
      </a>

      <div class="flex gap-4">
        <a v-if="facebookUrl" :href="facebookUrl" target="_blank" class="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-100 transition-all group">
          <span class="i-simple-icons-facebook w-5 h-5 text-gray-400 group-hover:text-blue-600"></span>
          <span class="text-sm font-medium text-gray-700">Facebook</span>
        </a>
        <a v-if="instagramUrl" :href="instagramUrl" target="_blank" class="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-gray-100 hover:bg-pink-50 hover:border-pink-100 transition-all group">
          <span class="i-simple-icons-instagram w-5 h-5 text-gray-400 group-hover:text-pink-600"></span>
          <span class="text-sm font-medium text-gray-700">Instagram</span>
        </a>
      </div>
    </div>

    <button class="w-full mt-8 bg-primary-600 hover:bg-primary-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-primary-200 transition-all transform hover:-translate-y-0.5 active:translate-y-0">
      Contact Sales Office
    </button>
  </div>
</template>
