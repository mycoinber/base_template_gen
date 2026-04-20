import { defineEventHandler, getQuery, getRouterParam, setHeader, setResponseStatus, createError } from 'h3';
import { createHash } from 'node:crypto';

const sanitizePath = (raw: string) => {
  return raw
    .split('/')
    .map((segment) => decodeURIComponent(segment).replace(/[^\w.\-]/g, ''))
    .filter(Boolean)
    .join('/');
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const baseUrl: string | undefined = (config.server as any).mediaStorageUrl
    || (config.public as any).mediaStorageUrl;

  if (!baseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'MEDIA_STORAGE_URL is not configured' });
  }

  const param = getRouterParam(event, 'path') || '';
  const cleanParam = sanitizePath(param);
  if (!cleanParam) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid media path' });
  }

  const query = getQuery(event);
  const params = new URLSearchParams();
  const keys = Object.keys(query).sort();
  for (const key of keys) {
    const value = query[key];
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry != null && entry !== '') params.append(key, String(entry));
      });
    } else if (value != null && value !== '') {
      params.set(key, String(value));
    }
  }
  const queryString = params.toString();
  const target = `${baseUrl.replace(/\/$/, '')}/${cleanParam}${queryString ? `?${queryString}` : ''}`;
  const rawCacheKey = `${cleanParam}${queryString ? `?${queryString}` : ''}`.toLowerCase();
  const cacheKey = createHash('sha1').update(rawCacheKey).digest('hex');
  const storage = useStorage('cache:media');

  const cachedMeta = await storage.getItem<{ contentType: string }>(`${cacheKey}:meta`).catch(() => null);
  const cachedBody = await storage.getItemRaw(`${cacheKey}:data`).catch(() => null);

  if (cachedMeta && cachedBody) {
    setHeader(event, 'content-type', cachedMeta.contentType || 'application/octet-stream');
    setHeader(event, 'cache-control', 'public, max-age=86400, s-maxage=31536000, immutable');
    return cachedBody;
  }

  try {
    const res = await fetch(target, {
      headers: {
        'Accept': event.node.req.headers['accept'] || '*/*',
        'User-Agent': event.node.req.headers['user-agent'] || 'nuxt-media-proxy',
      },
    });

    if (!res.ok) {
      setResponseStatus(event, res.status);
      return res.statusText;
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buffer = new Uint8Array(await res.arrayBuffer());

    await storage.setItemRaw(`${cacheKey}:data`, buffer);
    await storage.setItem(`${cacheKey}:meta`, { contentType });

    setHeader(event, 'content-type', contentType);
    setHeader(event, 'cache-control', 'public, max-age=86400, s-maxage=31536000, immutable');

    return buffer;
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Failed to fetch media' });
  }
});
