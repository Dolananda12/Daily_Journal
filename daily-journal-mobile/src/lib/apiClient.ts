import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'daily_journal_api_base_url';

// Your live Spring Boot backend on Render
export const PRODUCTION_API_URL = 'https://daily-journal-pbeh.onrender.com';

const DEFAULT_URL = PRODUCTION_API_URL;

let cachedBaseUrl: string | null = null;
const listeners = new Set<(url: string) => void>();

export async function getApiBaseUrl(): Promise<string> {
  if (cachedBaseUrl !== null) return cachedBaseUrl;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    cachedBaseUrl = saved || DEFAULT_URL;
  } catch {
    cachedBaseUrl = DEFAULT_URL;
  }
  return cachedBaseUrl;
}

export async function setApiBaseUrl(newUrl: string): Promise<void> {
  const clean = newUrl.trim().replace(/\/+$/, '');
  cachedBaseUrl = clean;
  await AsyncStorage.setItem(STORAGE_KEY, clean);
  listeners.forEach((fn) => fn(clean));
}

export function subscribeApiBaseUrl(listener: (url: string) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const baseUrl = await getApiBaseUrl();
  const fullUrl = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(fullUrl, init);
}
