
<script setup lang="ts">
const props = defineProps<{
    modelValue: string;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
}>();

const { t } = useI18n();

const sortOptions = computed(() => [
    { label: t('buildings.sort.newest_first'), value: 'date_desc' },
    { label: t('buildings.sort.oldest_first'), value: 'date_asc' },
    { label: t('buildings.sort.price_asc'), value: 'price_asc' },
    { label: t('buildings.sort.price_desc'), value: 'price_desc' },
    { label: t('buildings.sort.area_desc'), value: 'area_desc' },
    { label: t('buildings.sort.area_asc'), value: 'area_asc' },
]);

const updateSort = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    emit('update:modelValue', target.value);
};
</script>

<template>
    <div class="flex items-center gap-2">
        <label for="sort" class="text-sm font-medium text-gray-700 whitespace-nowrap">{{ $t('buildings.sort.label') }}</label>
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
