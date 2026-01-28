
import { ref, onMounted, watch } from 'vue';

export const useFavorites = () => {
    const favorites = ref<string[]>([]);

    const loadFavorites = () => {
        if (process.server) return;
        const stored = localStorage.getItem('building_favorites');
        if (stored) {
            try {
                favorites.value = JSON.parse(stored);
            } catch (e) {
                favorites.value = [];
            }
        }
    };

    const isFavorite = (id: string) => {
        return favorites.value.includes(id);
    };

    const toggleFavorite = (id: string) => {
        if (isFavorite(id)) {
            favorites.value = favorites.value.filter(f => f !== id);
        } else {
            favorites.value.push(id);
        }
        saveFavorites();
    };

    const saveFavorites = () => {
        if (process.server) return;
        localStorage.setItem('building_favorites', JSON.stringify(favorites.value));
    };

    onMounted(() => {
        loadFavorites();
    });

    return {
        favorites,
        isFavorite,
        toggleFavorite
    };
};
