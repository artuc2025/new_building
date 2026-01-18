
<script setup lang="ts">
const props = defineProps<{
    modelValue: string;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
}>();

const sortOptions = [
    { label: 'Newest First', value: 'date_desc' },
    { label: 'Oldest First', value: 'date_asc' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Area: Large to Small', value: 'area_desc' },
    { label: 'Area: Small to Large', value: 'area_asc' },
];

const updateSort = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    emit('update:modelValue', target.value);
};
</script>

<template>
    <div class="flex items-center gap-2">
        <label for="sort" class="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by</label>
        <select
            id="sort"
            :value="modelValue"
            @change="updateSort"
            class="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
        >
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
            </option>
        </select>
    </div>
</template>
