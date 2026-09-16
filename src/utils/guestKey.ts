// The guest key proves "I uploaded this" so a guest can delete their own uploads later. It lives only
// in this browser, per gallery link. Storage can be unavailable (private mode) — then it lasts for the tab.
const memory = new Map<string, string>();
const storageKey = (galleryToken: string) => `photodrop.guestKey.${galleryToken}`;

export function readGuestKey(galleryToken: string): string | null {
  try {
    return localStorage.getItem(storageKey(galleryToken)) ?? memory.get(galleryToken) ?? null;
  } catch {
    return memory.get(galleryToken) ?? null;
  }
}

export function saveGuestKey(galleryToken: string, key: string | null) {
  if (key) memory.set(galleryToken, key);
  else memory.delete(galleryToken);
  try {
    if (key) localStorage.setItem(storageKey(galleryToken), key);
    else localStorage.removeItem(storageKey(galleryToken));
  } catch {
    // in-memory copy above still works for this session
  }
}
