
<script setup lang="ts">
import BuildingGallery from '~/components/buildings/detail/BuildingGallery.vue';
import BuildingInfo from '~/components/buildings/detail/BuildingInfo.vue';
import ContactSection from '~/components/buildings/detail/ContactSection.vue';
import PriceRangeDisplay from '~/components/buildings/detail/PriceRangeDisplay.vue';
import MapComponent from '~/components/buildings/detail/MapComponent.vue';
import { useBuilding } from '~/composables/useBuilding';
import { useFavorites } from '~/composables/useFavorites';

const route = useRoute();
const id = route.params.id as string;
const { locale } = useI18n();
const { building, loading, error, fetchBuilding } = useBuilding(id);
const { isFavorite, toggleFavorite } = useFavorites();

const currency = ref('AMD');

const getLocalizedValue = (obj: any) => {
    return obj?.[locale.value] || Object.values(obj || {})[0] || '';
};

const title = computed(() => getLocalizedValue(building.value?.title));
const description = computed(() => getLocalizedValue(building.value?.description));
const address = computed(() => getLocalizedValue(building.value?.address));

onMounted(() => {
    fetchBuilding(currency.value);
});

watch(currency, (newVal) => {
    fetchBuilding(newVal);
});
</script>

<template>
    <div class="bg-white min-h-screen">
        <!-- Hero/Header Section -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <nav class="flex mb-8 text-sm text-gray-500" aria-label="Breadcrumb">
                <NuxtLink to="/buildings" class="hover:text-primary-600 flex items-center text-decoration-none">
                    <span class="i-heroicons-arrow-left w-4 h-4 mr-1"></span>
                    Back to Listings
                </NuxtLink>
            </nav>

            <div v-if="loading" class="animate-pulse space-y-8">
                <div class="h-10 bg-gray-200 rounded-lg w-1/3"></div>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div class="lg:col-span-2 space-y-6">
                        <div class="aspect-w-16 aspect-h-9 bg-gray-200 rounded-3xl"></div>
                        <div class="h-32 bg-gray-200 rounded-2xl"></div>
                    </div>
                    <div class="space-y-6">
                        <div class="h-64 bg-gray-200 rounded-2xl"></div>
                    </div>
                </div>
            </div>

            <div v-else-if="error" class="text-center py-20">
                <span class="i-heroicons-exclamation-triangle w-16 h-16 text-red-500 mx-auto mb-4 block"></span>
                <h2 class="text-2xl font-bold text-gray-900">{{ error }}</h2>
                <button @click="fetchBuilding(currency)" class="mt-4 text-primary-600 font-medium">Try again</button>
            </div>

            <div v-else-if="building" class="space-y-12">
                <!-- Title & Price Header -->
                <div class="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div class="space-y-2 max-w-2xl">
                        <div class="flex items-center gap-3">
                            <h1 class="text-4xl font-extrabold text-gray-900 leading-tight">
                                {{ title }}
                            </h1>
                            <button 
                                @click="toggleFavorite(id)"
                                class="p-3 rounded-full hover:bg-red-50 transition-colors group"
                            >
                                <span 
                                    :class="[
                                        isFavorite(id) ? 'i-heroicons-heart-solid text-red-500' : 'i-heroicons-heart text-gray-300 group-hover:text-red-400',
                                        'w-8 h-8'
                                    ]"
                                ></span>
                            </button>
                        </div>
                        <p class="text-lg text-gray-500 flex items-center gap-2">
                            <span class="i-heroicons-map-pin w-5 h-5 text-primary-500"></span>
                            {{ address }}, {{ building.city }}
                        </p>
                    </div>

                    <div class="flex flex-col items-end gap-2">
                        <div class="bg-gray-100 p-1 rounded-xl flex gap-1">
                            <button 
                                @click="currency = 'AMD'"
                                :class="['px-4 py-2 rounded-lg text-sm font-bold transition-all', currency === 'AMD' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700']"
                            >AMD</button>
                            <button 
                                @click="currency = 'USD'"
                                :class="['px-4 py-2 rounded-lg text-sm font-bold transition-all', currency === 'USD' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700']"
                            >USD</button>
                        </div>
                        <p class="text-xs text-gray-400 uppercase tracking-tighter">Fixed rate: 1 USD = 400 AMD</p>
                    </div>
                </div>

                <!-- Main Grid -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <!-- Left Column: Gallery & Info -->
                    <div class="lg:col-span-2 space-y-12">
                        <BuildingGallery :images="[]" />
                        
                        <div class="space-y-6">
                            <h3 class="text-2xl font-bold text-gray-900">About this building</h3>
                            <div class="prose prose-lg text-gray-600 max-w-none">
                                {{ description || 'No description available.' }}
                            </div>
                        </div>

                        <BuildingInfo 
                            :floors="building.floors"
                            :total-units="building.totalUnits"
                            :commissioning-date="building.commissioningDate"
                            :construction-status="building.constructionStatus"
                        />

                        <div class="space-y-6">
                            <h3 class="text-2xl font-bold text-gray-900 uppercase tracking-wide">Location</h3>
                            <MapComponent 
                                :lat="building.location.lat" 
                                :lng="building.location.lng" 
                                :title="title"
                            />
                        </div>
                    </div>

                    <!-- Right Column: Pricing & Contact -->
                    <div class="space-y-8">
                        <div class="sticky top-8 space-y-8">
                            <PriceRangeDisplay 
                                :price-min="building.pricePerM2Min"
                                :price-max="building.pricePerM2Max"
                                :currency="building.currency"
                                :area-min="building.areaMin"
                                :area-max="building.areaMax"
                            />

                            <ContactSection 
                                :developer-name="getLocalizedValue(building.developer?.name) || 'Unknown Developer'"
                                :website-url="building.developerWebsiteUrl"
                                :facebook-url="building.developerFacebookUrl"
                                :instagram-url="building.developerInstagramUrl"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
