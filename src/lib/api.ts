export function getApiBase() {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base || base === "/api") return "/api";
  return base.replace(/\/+$/, "");
}

export async function apiFetch(path: string, init?: RequestInit) {
  const base = getApiBase();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  return fetch(url, init);
}
