export default defineEventHandler((event) => {
  return {
    status: 'ok',
    service: 'frontend',
    timestamp: new Date().toISOString(),
  };
});

