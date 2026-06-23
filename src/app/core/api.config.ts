declare global {
  interface Window {
    __AMAS_API_BASE_URL__?: string;
  }
}

const productionApiBaseUrl = 'https://apinet.amaslohaceposible.cloud/api/v1';

const runtimeApiBaseUrl =
  typeof window === 'undefined' ? '' : window.__AMAS_API_BASE_URL__?.trim() ?? '';

const localApiBaseUrl =
  typeof window === 'undefined' ? '' : `${window.location.protocol}//${window.location.hostname}:8080/api/v1`;

const defaultApiBaseUrl =
  typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? localApiBaseUrl
    : productionApiBaseUrl;

export const API_BASE_URL = runtimeApiBaseUrl || defaultApiBaseUrl;
export const API_ORIGIN_URL = API_BASE_URL.replace(/\/api\/v1$/, '');
