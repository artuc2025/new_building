<script setup lang="ts">
const route = useRoute();
const buildingId = route.params.id;
</script>

<template>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="bg-white shadow rounded-lg p-6 text-center">
            <div class="i-heroicons-building-office-2 w-16 h-16 mx-auto text-gray-300 mb-4"></div>
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Building Details</h1>
            <p class="text-gray-500 mb-8">
                Details for building ID: <span class="font-mono bg-gray-100 px-2 py-1 rounded">{{ buildingId }}</span>
            </p>
            <p class="text-sm text-gray-400 mb-6">This page is currently under construction.</p>
            
            <NuxtLink to="/buildings" class="inline-flex items-center text-primary-600 hover:text-primary-700 font-medium">
                <span class="i-heroicons-arrow-left w-4 h-4 mr-2"></span>
                Back to Listings
            </NuxtLink>
        </div>
    </div>
</template>
