// Central API base configuration
// Reads from REACT_APP_API_BASE or falls back to deployed API URL
// Updated: 2025-09-25 - Fixed API endpoint for production
// FORCE REBUILD v2 - ENDPOINT CORRECTO
export const BASE_URL = (process.env.REACT_APP_API_BASE || 'https://npgtowx3yd.execute-api.us-east-1.amazonaws.com/Prod').replace(/\/$/, '');
//testing - ENDPOINT ACTUALIZADO
export function api(path) {
  if (!path) return BASE_URL;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

// Debug info
console.log('🔧 apiConfig loaded - BASE_URL:', BASE_URL);
