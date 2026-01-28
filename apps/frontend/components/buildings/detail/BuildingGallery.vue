
<script setup lang="ts">
const props = defineProps<{
  images?: string[]; // URLs
}>();

const activeIndex = ref(0);
const galleryImages = computed(() => {
  if (props.images && props.images.length > 0) return props.images;
  // Fallback placeholders
  return [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200',
    'https://images.unsplash.com/photo-1460317442991-0ec239397118?auto=format&fit=crop&w=1200',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200'
  ];
});
</script>

<template>
  <div class="space-y-4">
    <div class="aspect-w-16 aspect-h-9 overflow-hidden rounded-3xl bg-gray-100 shadow-inner group relative">
      <img 
        :src="galleryImages[activeIndex]" 
        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
        alt="Building view"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none"></div>
    </div>
    
    <div class="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
      <button 
        v-for="(img, idx) in galleryImages" 
        :key="idx"
        @click="activeIndex = idx"
        :class="['flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all', activeIndex === idx ? 'border-primary-500 scale-95 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100']"
      >
        <img :src="img" class="w-full h-full object-cover" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
