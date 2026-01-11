<script setup lang="ts">
interface Props {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface Emits {
  (e: 'page-change', page: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const goToPage = (page: number) => {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('page-change', page);
  }
};

const goToPrev = () => {
  if (props.hasPrevPage) {
    goToPage(props.currentPage - 1);
  }
};

const goToNext = () => {
  if (props.hasNextPage) {
    goToPage(props.currentPage + 1);
  }
};

// Calculate page numbers to display
const pageNumbers = computed(() => {
  const pages: (number | string)[] = [];
  const total = props.totalPages;
  const current = props.currentPage;

  if (total <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);

    if (current <= 3) {
      // Near the start
      for (let i = 2; i <= 4; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(total);
    } else if (current >= total - 2) {
      // Near the end
      pages.push('...');
      for (let i = total - 3; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // In the middle
      pages.push('...');
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i);
      }
      pages.push('...');
      pages.push(total);
    }
  }

  return pages;
});
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination flex items-center justify-center gap-2" aria-label="Pagination">
    <!-- Previous Button -->
    <button
      @click="goToPrev"
      :disabled="!hasPrevPage"
      :class="[
        'px-4 py-2 border rounded-md text-sm font-medium transition-colors',
        hasPrevPage
          ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
      ]"
      aria-label="Previous page"
    >
      Previous
    </button>

    <!-- Page Numbers -->
    <div class="flex items-center gap-1">
      <button
        v-for="(page, index) in pageNumbers"
        :key="index"
        @click="typeof page === 'number' ? goToPage(page) : null"
        :disabled="typeof page === 'string'"
        :class="[
          'px-3 py-2 border rounded-md text-sm font-medium transition-colors min-w-[2.5rem]',
          typeof page === 'string'
            ? 'border-transparent text-gray-500 cursor-default'
            : page === currentPage
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        ]"
        :aria-label="typeof page === 'number' ? `Go to page ${page}` : undefined"
        :aria-current="page === currentPage ? 'page' : undefined"
      >
        {{ page }}
      </button>
    </div>

    <!-- Next Button -->
    <button
      @click="goToNext"
      :disabled="!hasNextPage"
      :class="[
        'px-4 py-2 border rounded-md text-sm font-medium transition-colors',
        hasNextPage
          ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
      ]"
      aria-label="Next page"
    >
      Next
    </button>
  </nav>
</template>

<style scoped>
.pagination {
  padding: 1rem 0;
}
</style>
