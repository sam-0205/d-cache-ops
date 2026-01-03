const BASE_URL = "http://localhost:4000";

export async function fetchServiceMetrics() {
  const res = await fetch(`${BASE_URL}/metrics/services`);
  return res.json();
}

export async function fetchEndpointMetrics() {
  const res = await fetch(`${BASE_URL}/metrics/endpoints`);
  return res.json();
}
