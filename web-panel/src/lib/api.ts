const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchAPI(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (email: string, name: string, password: string) =>
    fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify({ email, name, password }) }),

  getDevices: () => fetchAPI('/devices'),

  createDevice: (name: string) =>
    fetchAPI('/devices', { method: 'POST', body: JSON.stringify({ name }) }),

  deleteDevice: (id: string) =>
    fetchAPI(`/devices/${id}`, { method: 'DELETE' }),

  getLocations: (deviceId: string, params?: { start?: string; end?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.start) qs.set('start', params.start);
    if (params?.end) qs.set('end', params.end);
    if (params?.limit) qs.set('limit', String(params.limit));
    const q = qs.toString();
    return fetchAPI(`/locations/${deviceId}${q ? `?${q}` : ''}`);
  },

  getLatestLocation: (deviceId: string) => fetchAPI(`/locations/latest/${deviceId}`),
};
