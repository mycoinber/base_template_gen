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
    if (manifestState.value == null) {
      manifestState.value = await readManifestFromDisk();
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
