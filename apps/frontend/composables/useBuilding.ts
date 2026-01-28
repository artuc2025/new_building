
import type { BuildingResponseDto } from '~/api/client';

export const useBuilding = (id: string) => {
    const building = ref<BuildingResponseDto | null>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);
    const api = useApi();

    const fetchBuilding = async (currency = 'AMD') => {
        loading.value = true;
        error.value = null;
        try {
            const response = await api.api.listingsControllerFindOne(id, { currency });
            // The controller returns { data: BuildingResponseDto }
            if (response.data && response.data.data) {
                building.value = response.data.data as BuildingResponseDto;
            }
        } catch (err: any) {
            console.error('Failed to fetch building:', err);
            error.value = err.message || 'Failed to load building details.';
        } finally {
            loading.value = false;
        }
    };

    return {
        building,
        loading,
        error,
        fetchBuilding
    };
};
