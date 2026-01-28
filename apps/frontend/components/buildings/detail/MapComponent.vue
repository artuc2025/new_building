
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  lat: number;
  lng: number;
  zoom?: number;
  title?: string;
}>();

const mapContainer = ref<HTMLElement | null>(null);
let map: any = null;
let marker: any = null;

const initMap = async () => {
  if (process.server) return;
  
  const L = await import('leaflet');
  if (!L || !mapContainer.value) return;

  // Fix default icon issue in Leaflet with webpack/vite
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });

  map = L.map(mapContainer.value).setView([props.lat, props.lng], props.zoom || 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  marker = L.marker([props.lat, props.lng]).addTo(map);
  if (props.title) {
    marker.bindPopup(props.title);
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

watch(() => [props.lat, props.lng], ([newLat, newLng]) => {
  if (map && marker) {
    const pos: [number, number] = [newLat, newLng];
    map.setView(pos, props.zoom || 15);
    marker.setLatLng(pos);
  }
});
</script>

<template>
  <div class="rounded-3xl overflow-hidden border border-gray-200 shadow-inner bg-gray-50 h-[400px]">
    <div ref="mapContainer" class="w-full h-full z-0"></div>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  </div>
</template>

<style>
.leaflet-container {
  font-family: inherit;
}
.leaflet-bar {
  border: none !important;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
}
.leaflet-bar a {
  background-color: white !important;
  color: #374151 !important;
  border: 1px solid #f3f4f6 !important;
}
</style>
