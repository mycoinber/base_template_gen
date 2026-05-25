import { watch } from 'vue';
import type { WebsiteManifestPayload } from '~/utils/manifestHead';

const MANIFEST_STATE_KEY = 'siteManifest';
const MANIFEST_FILE_NAME = 'site-manifest.json';

export async function useSiteManifest() {
  const manifestState = useState<WebsiteManifestPayload | null>(
    MANIFEST_STATE_KEY,
    () => null,
  );

  if (import.meta.server) {
    let requestOrigin = '';
    let userAgent = '';
    try {
      requestOrigin = useRequestURL().origin;
      userAgent = useRequestHeaders(['user-agent'])['user-agent'] || '';
    } catch {
      requestOrigin = '';
      userAgent = '';
    }

    if (manifestState.value == null) {
      manifestState.value = await readManifestFromDisk();
      if (manifestState.value == null) {
        manifestState.value = await readManifestFromCurrentOrigin({
          origin: requestOrigin,
          userAgent,
        });
      }
    }
    return { data: manifestState };
  }

  if (manifestState.value == null) {
    const { data } = await useFetch<WebsiteManifestPayload>(
      `/${MANIFEST_FILE_NAME}`,
      {
        key: MANIFEST_FILE_NAME,
        server: false,
        default: () => null,
      },
    );

    watch(
      () => data.value,
      (value) => {
        manifestState.value = value ?? null;
      },
      { immediate: true },
    );
  }

  return { data: manifestState };
}

async function readManifestFromDisk(): Promise<WebsiteManifestPayload | null> {
  if (!import.meta.server) {
    return null;
  }

  const nitroApp = typeof useNitroApp === 'function' ? useNitroApp() : null;
  const storage = (nitroApp as any)?.storage;
  if (!storage) {
    return null;
  }
  try {
    const raw = await storage.getItem(`root:public/${MANIFEST_FILE_NAME}`);
    if (!raw) {
      return null;
    }

    const text = normalizeRawValue(raw);
    if (!text) {
      return null;
    }

    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readManifestFromCurrentOrigin(params: {
  origin?: string | null;
  userAgent?: string | null;
}): Promise<WebsiteManifestPayload | null> {
  if (!import.meta.server) {
    return null;
  }

  const origin = params.origin ? String(params.origin).trim() : '';
  if (!origin) {
    return null;
  }

  const userAgent = params.userAgent ? String(params.userAgent).trim() : '';

  try {
    const manifestUrl = new URL(`/${MANIFEST_FILE_NAME}`, origin).toString();
    const payload = await $fetch<unknown>(manifestUrl, {
      headers: {
        accept: 'application/json',
        ...(userAgent ? { 'user-agent': userAgent } : {}),
      },
    });

    if (!isManifestPayload(payload)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function isManifestPayload(value: unknown): value is WebsiteManifestPayload {
  return Boolean(value) && typeof value === 'object';
}

function normalizeRawValue(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }
  if (!value) {
    return null;
  }
  if (value instanceof Uint8Array) {
    return new TextDecoder('utf-8').decode(value);
  }
  if (value instanceof ArrayBuffer) {
    return new TextDecoder('utf-8').decode(new Uint8Array(value));
  }
  if (typeof value === 'object' && 'toString' in value) {
    try {
      return String(value);
    } catch {
      return null;
    }
  }
  return null;
}
