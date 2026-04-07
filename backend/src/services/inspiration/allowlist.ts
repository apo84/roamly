/** Hostnames allowed for travel-link inspiration (lowercase, no port). */
const ALLOWED_HOSTS = new Set([
  "instagram.com",
  "www.instagram.com",
  "tiktok.com",
  "www.tiktok.com",
  "m.tiktok.com",
  "vm.tiktok.com",
  "vt.tiktok.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "m.youtube.com",
]);

export function hostnameAllowed(host: string): boolean {
  const h = host.toLowerCase().split(":")[0] ?? "";
  return ALLOWED_HOSTS.has(h);
}

export function parseHttpUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

export function urlAllowed(url: string): boolean {
  const u = parseHttpUrl(url);
  if (!u) return false;
  return hostnameAllowed(u.hostname);
}
