
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import type { BuildingResponseDto } from '~/api/client';

const props = defineProps<{
  buildings: BuildingResponseDto[];
  loading?: boolean;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: any = null;
let markerClusterGroup: any = null;

const initMap = async () => {
  if (process.server) return;
  
  const L = await import('leaflet');
  await import('leaflet.markercluster');
  // Need to import css for markercluster as well
  
  if (!L || !mapContainer.value) return;

  // Fix default icon issue
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });

  map = L.map(mapContainer.value).setView([40.1811, 44.5144], 12); // Center of Yerevan

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // @ts-ignore
  markerClusterGroup = L.markerClusterGroup();
  map.addLayer(markerClusterGroup);

  updateMarkers(L);
};

const updateMarkers = (L: any) => {
  if (!markerClusterGroup) return;
  
  markerClusterGroup.clearLayers();
  
  props.buildings.forEach(building => {
    if (building.location?.lat && building.location?.lng) {
      const marker = L.marker([building.location.lat, building.location.lng]);
      
      const title = typeof building.title === 'string' ? building.title : Object.values(building.title || {})[0] || 'Building';
      const address = typeof building.address === 'string' ? building.address : Object.values(building.address || {})[0] || '';
      
      marker.bindPopup(`
        <div class="p-2 min-w-[200px]">
          <h3 class="font-bold text-gray-900 mb-1">${title}</h3>
          <p class="text-xs text-gray-500 mb-2">${address}</p>
          <div class="flex justify-between items-center mt-2">
            <span class="text-primary-600 font-bold">${building.pricePerM2Min} ${building.currency}/m²</span>
            <a href="/buildings/${building.id}" class="text-xs bg-primary-600 text-white px-2 py-1 rounded">Details</a>
          </div>
        </div>
      `);
      markerClusterGroup.addLayer(marker);
    }
  });

  if (props.buildings.length > 0 && markerClusterGroup.getLayers().length > 0) {
    map.fitBounds(markerClusterGroup.getBounds(), { padding: [50, 50] });
  }
};

onMounted(() => {
  setTimeout(() => {
    initMap();
  }, 100);
});

onUnmounted(() => {
  if (map) {
    map.remove();
  }
});

watch(() => props.buildings, async () => {
    if (map) {
        const L = await import('leaflet');
        updateMarkers(L);
    }
}, { deep: true });
</script>

<template>
  <div class="rounded-3xl overflow-hidden border border-gray-200 shadow-inner bg-gray-50 h-[600px] relative">
    <div ref="mapContainer" class="w-full h-full z-0"></div>
    
    <!-- Scripts & Styles -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css" />

    <div v-if="loading" class="absolute inset-0 bg-white/50 flex items-center justify-center z-[1000]">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  </div>
</template>

<style>
.leaflet-container {
  font-family: inherit;
}
.marker-cluster-small { background-color: rgba(16, 185, 129, 0.6); }
.marker-cluster-small div { background-color: rgba(16, 185, 129, 0.8); color: white; }
.marker-cluster-medium { background-color: rgba(59, 130, 246, 0.6); }
.marker-cluster-medium div { background-color: rgba(59, 130, 246, 0.8); color: white; }
.marker-cluster-large { background-color: rgba(139, 92, 246, 0.6); }
.marker-cluster-large div { background-color: rgba(139, 92, 246, 0.8); color: white; }
</style>
