
import { Api } from '~/api/client';

export const useApi = () => {
    const config = useRuntimeConfig();
    // In development proxy /api requests to localhost:3000
    // In production this should be the full URL
    const baseUrl = config.public.apiBaseUrl as string || '';

    const api = new Api({
        baseURL: baseUrl,
    });

    return api;
};
