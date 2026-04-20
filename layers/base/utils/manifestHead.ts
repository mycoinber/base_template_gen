export interface WebsiteManifestIcon {
  rel?: string | null;
  type?: string | null;
  sizes?: string | null;
  media?: string | null;
  purpose?: string | null;
  fileName?: string | null;
  s3Url?: string | null;
  href?: string | null;
}

export interface WebsiteManifestPayload {
  meta?: Record<string, string | null | undefined> | null;
  icons?: WebsiteManifestIcon[] | null;
}

interface HeadPayload {
  meta: Array<Record<string, string>>;
  link: Array<Record<string, string>>;
}

const assetExtensions = new Set([
  'png',
  'svg',
  'ico',
  'json',
  'xml',
  'webmanifest',
]);

export function manifestToHead(manifest?: WebsiteManifestPayload | null): HeadPayload {
  if (!manifest) {
    return { meta: [], link: [] };
  }

  const meta: Array<Record<string, string>> = [];
  const icons: Array<Record<string, string>> = [];

  if (manifest.meta && typeof manifest.meta === 'object') {
    for (const [rawKey, rawValue] of Object.entries(manifest.meta)) {
      const key = rawKey?.trim();
      if (!key) {
        continue;
      }

      const normalizedValue = normalizeMetaValue(rawValue);
      if (normalizedValue == null) {
        continue;
      }

      meta.push({
        name: key,
        content: normalizedValue,
      });
    }
  }

  if (Array.isArray(manifest.icons)) {
    for (const icon of manifest.icons) {
      const rel = icon?.rel ?? 'icon';
      const href = normalizeIconHref(icon);
      if (!href) {
        continue;
      }

      const linkEntry: Record<string, string> = {
        rel,
        href,
      };

      if (icon?.type) {
        linkEntry.type = icon.type;
      }
      if (icon?.sizes) {
        linkEntry.sizes = icon.sizes;
      }
      if (icon?.media) {
        linkEntry.media = icon.media;
      }
      if (icon?.purpose) {
        linkEntry.purpose = icon.purpose;
      }

      icons.push(linkEntry);
    }
  }

  return {
    meta,
    link: icons,
  };
}

function normalizeMetaValue(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return null;
  }

  if (stringValue.startsWith('#') || /^https?:\/\//i.test(stringValue) || stringValue.startsWith('data:')) {
    return stringValue;
  }

  const extensionMatch = stringValue.match(/\.([a-z0-9]+)(?:\?|$)/i);
  if (!extensionMatch) {
    return stringValue;
  }

  const extension = extensionMatch[1]?.toLowerCase();
  if (!extension || !assetExtensions.has(extension)) {
    return stringValue;
  }

  const filename = extractFileName(stringValue);
  return filename ? `/${filename}` : `/${stringValue.replace(/^\/+/, '')}`;
}

function normalizeIconHref(icon: WebsiteManifestIcon | null | undefined): string | null {
  if (!icon) {
    return null;
  }

  const candidate = icon.fileName || icon.s3Url || icon.href;
  if (!candidate) {
    return null;
  }

  if (/^https?:\/\//i.test(candidate) || candidate.startsWith('data:')) {
    return candidate;
  }

  const filename = extractFileName(candidate);
  return filename ? `/${filename}` : `/${candidate.replace(/^\/+/, '')}`;
}

function extractFileName(path: string): string | null {
  const trimmed = path.trim().replace(/\?.*$/, '');
  if (!trimmed) {
    return null;
  }
  const parts = trimmed.split('/');
  const last = parts[parts.length - 1];
  return last ? last.replace(/^\/+/, '') : null;
}
