export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const apiBaseUrl = config.public.apiBaseUrl || 'http://localhost:3000/api';
  
  // Derive gateway base URL (strip trailing /api)
  const gatewayBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
  const healthUrl = `${gatewayBaseUrl}/healthz/live`;
  
  try {
    // Check API gateway with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API Gateway returned ${response.status}`);
    }
    
    return {
      status: 'ok',
      service: 'frontend',
      timestamp: new Date().toISOString(),
      dependencies: {
        apiGateway: 'reachable',
      },
    };
  } catch (error) {
    // Return non-200 status if API gateway is unreachable
    setResponseStatus(event, 503);
    return {
      status: 'error',
      service: 'frontend',
      timestamp: new Date().toISOString(),
      error: 'API Gateway unreachable',
      dependencies: {
        apiGateway: 'unreachable',
      },
    };
  }
});

