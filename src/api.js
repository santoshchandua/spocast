import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
const host = Constants.expoConfig?.hostUri?.split(':')[0];
export const API = process.env.EXPO_PUBLIC_API_URL || `http://${host || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost')}:4000`;
let accessToken = null, csrfToken = null, initialized = false;
const native = Platform.OS !== 'web';
export async function setSession(data) {
  csrfToken = data?.csrfToken || null; accessToken = data?.token || null; initialized = true;
  if (native) { if (accessToken) await SecureStore.setItemAsync('cp-session', accessToken, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }); else await SecureStore.deleteItemAsync('cp-session'); }
}
export async function restoreSession() {
  const data = await request('/auth/session'); csrfToken = data.csrfToken; return data.user;
}
export async function request(path, signal, options = {}) {
  if (!__DEV__ && !API.startsWith('https://')) throw new Error('A secure HTTPS API URL is required for release builds.');
  if (!initialized) { if (native) accessToken = await SecureStore.getItemAsync('cp-session'); initialized = true; }
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);
  if (signal?.aborted) cancel();
  const timer = setTimeout(cancel, 10000);
  try {
    const response = await fetch(`${API}/api${path}`, { method: options.method || 'GET', credentials: native ? 'omit' : 'include', headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(native && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(!native && csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...options.headers }, ...(options.body ? { body: JSON.stringify(options.body) } : {}), signal: controller.signal });
    const body = await response.json();
    if (!response.ok) { if (response.status === 401 && native) await setSession(null); const error = new Error(body.error || `Request failed (${response.status})`); error.status = response.status; throw error; }
    return body.data;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
}
export const mutate = (path, body = {}, method = 'POST', headers = {}) => request(path, undefined, { method, body, headers });
