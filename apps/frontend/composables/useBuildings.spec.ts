import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBuildings } from './useBuildings';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { registerEndpoint } from '@nuxt/test-utils/runtime';

// Mock the useApi composable
const mockFindAll = vi.fn();
vi.mock('~/composables/useApi', () => ({
    useApi: () => ({
        api: {
            listingsControllerFindAll: mockFindAll
        }
    })
}));

describe('useBuildings', () => {
    beforeEach(() => {
        // Setup Pinia
        setActivePinia(createTestingPinia({
            createSpy: vi.fn,
            stubActions: false, // Important to allow actions to run
        }));

        mockFindAll.mockReset();
    });

    it('initializes with default values', () => {
        const { buildings, loading, error, pagination } = useBuildings();

        expect(buildings.value).toEqual([]);
        expect(loading.value).toBe(false);
        expect(error.value).toBe(null);
        expect(pagination.value).toBe(null);
    });

    it('fetchBuildings calls API and updates store on success', async () => {
        const { fetchBuildings, buildings, pagination } = useBuildings();

        const mockData = {
            data: {
                data: [{ id: '1', title: 'Test Building' }],
                pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
            }
        };

        mockFindAll.mockResolvedValue(mockData);

        await fetchBuildings();

        expect(mockFindAll).toHaveBeenCalled();
        expect(buildings.value).toHaveLength(1);
        expect(buildings.value[0].title).toBe('Test Building');
        expect(pagination.value).not.toBeNull();
    });

    it('handles errors gracefully', async () => {
        const { fetchBuildings, error, loading } = useBuildings();

        mockFindAll.mockRejectedValue(new Error('API Error'));

        await fetchBuildings();

        expect(error.value).toBe('API Error');
        expect(loading.value).toBe(false);
    });

    it('updateFilters updates filters and triggers fetch', async () => {
        const { updateFilters, filters } = useBuildings();

        mockFindAll.mockResolvedValue({ data: { data: [], pagination: {} } });

        updateFilters({ price_min: 100000 });

        expect(filters.value.price_min).toBe(100000);
        expect(mockFindAll).toHaveBeenCalled();
    });

    it('goToPage updates page and triggers fetch', async () => {
        const { goToPage, filters } = useBuildings();

        mockFindAll.mockResolvedValue({ data: { data: [], pagination: {} } });

        goToPage(2);

        expect(filters.value.page).toBe(2);
        expect(mockFindAll).toHaveBeenCalled();
    });
});
