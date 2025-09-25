// Central API base configuration
// Reads from REACT_APP_API_BASE or falls back to deployed API URL
export const BASE_URL = (process.env.REACT_APP_API_BASE || 'https://npgtowx3yd.execute-api.us-east-1.amazonaws.com/Prod').replace(/\/$/, '');
//testing
export function api(path) {
  if (!path) return BASE_URL;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
