const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.message || text;
    } catch {
      // ignore parse error
    }
    throw new Error(message || `Request failed with status ${res.status}`);
  }

  if (res.status === 204) {
    // no content
    return null as T;
  }

  return (await res.json()) as T;
}
