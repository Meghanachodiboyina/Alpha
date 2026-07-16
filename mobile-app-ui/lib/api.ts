import Constants from 'expo-constants';
import { supabase } from './supabase';

// Auto-detect the API base URL.
// When running on a physical device via Expo Go, use your machine's local IP.
// On emulators/simulators, localhost works (Android uses 10.0.2.2).
const getApiBaseUrl = (): string => {
  // If a production or explicit API URL is set via environment variable, use it securely.
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Fallback for local development via Expo Go
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:8000`;
  }
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
};

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || null;
    } catch {
      return null;
    }
  }

  async request<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;
    const token = await this.getAuthToken();

    const isFormData = body instanceof FormData;
    const fetchHeaders: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    };

    if (token) {
      fetchHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: fetchHeaders,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
      cache: 'no-store',
    });

    if (response.status === 401) {
      // Clear auth state on unauthorized
      await supabase.auth.signOut();
      throw { status: 401, message: 'Unauthorized' };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        status: response.status,
        message: errorData.detail || 'Request failed',
        data: errorData,
      };
    }

    if (response.status === 204) {
      return null as any;
    }

    const text = await response.text();
    return text ? JSON.parse(text) : (null as any);
  }

  get<T = any>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T = any>(path: string, body?: any) {
    return this.request<T>(path, { method: 'POST', body });
  }

  put<T = any>(path: string, body?: any) {
    return this.request<T>(path, { method: 'PUT', body });
  }

  delete<T = any>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  patch<T = any>(path: string, body?: any) {
    return this.request<T>(path, { method: 'PATCH', body });
  }
}

const api = new ApiClient(API_BASE_URL);
export default api;
