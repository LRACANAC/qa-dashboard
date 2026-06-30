const PROXY_URL = '/api/ptt';

async function fetchFromProxy(endpoint: string, params: Record<string, string> = {}) {
  const query = new URLSearchParams({ endpoint, ...params }).toString();
  const res = await fetch(`${PROXY_URL}?${query}`);
  const json = await res.json();
  return json;
}

export async function getHealth() {
  return fetchFromProxy('/health');
}

export async function getCruceGPS(date: string) {
  return fetchFromProxy('/api/v1/cruce', { date });
}

export async function getDailyLatest() {
  return fetchFromProxy('/api/v1/daily/latest');
}

export async function getHistory(days: number = 7) {
  return fetchFromProxy('/api/v1/history', { days: days.toString() });
}