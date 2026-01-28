const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "http://localhost:4000";

console.log("API_BASE_URL at runtime:", API_BASE_URL);

function normalizeBase(base: string) {
  // remove duplicate protocol mistakes
  return base
    .replace(/^https?:\/\/https?:\/\//, "https://")
    .replace(/^https?:\/\/https\/\//, "https://")
    .replace(/\/+$/, "");
}

function joinUrl(base: string, path: string) {
  const b = normalizeBase(base);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(joinUrl(API_BASE_URL, path), {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.message || text;
    } catch {
      // ignore
    }
    throw new Error(message || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) return null as T;
  return (await res.json()) as T;
}
