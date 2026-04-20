const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);

const proxyPrefixes = ['/siteid/', '/uploads/', '/storage/', '/resized/'];

export const resolveMediaPath = (raw?: string | null) => {
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;

  const normalized = ensureLeadingSlash(raw);

  if (normalized.startsWith('/media/')) return normalized;

  if (proxyPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return `/media${normalized}`;
  }

  return normalized;
};

export const mediaProvider = (src?: string | null) => {
  if (!src) return undefined;
  if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
    return 'none';
  }
  if (typeof src === 'string' && src.startsWith('/media/')) {
    return 'none';
  }
  return undefined;
};
