import { joinURL } from 'ufo';
import { resolveMediaPath } from '~/utils/mediaPath';

type ProviderOptions = {
  baseURL?: string;
  modifiers?: Record<string, string | number | undefined>;
};

const stripMediaPrefix = (value: string) => value.replace(/^\/+/, '').replace(/^media\/?/, '');
const resizedWithWidth = /\/resized\/\d+\//;

const MIN_VARIANT_WIDTH = 320;

const applyWidthVariant = (path: string, width?: string | number) => {
  if (!width) return { path, applied: false };
  if (!path.includes('/resized/')) return { path, applied: false };
  const widthNumber = Number(width);
  if (!Number.isFinite(widthNumber)) {
    return { path, applied: false };
  }
  const effectiveWidth = widthNumber < MIN_VARIANT_WIDTH ? MIN_VARIANT_WIDTH : Math.round(widthNumber);
  const normalizedWidth = String(effectiveWidth).trim();
  if (!normalizedWidth) return { path, applied: false };
  if (resizedWithWidth.test(path)) {
    return {
      path: path.replace(/\/resized\/\d+\//, `/resized/${normalizedWidth}/`),
      applied: true,
    };
  }
  return {
    path: path.replace(/\/resized\//, `/resized/${normalizedWidth}/`),
    applied: true,
  };
};

export const getImage = (src: string, { modifiers = {}, baseURL = '/media' }: ProviderOptions = {}) => {
  const normalized = resolveMediaPath(src);
  if (!normalized) {
    return { url: '' };
  }

  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    return { url: normalized };
  }

  if (!normalized.startsWith('/media/')) {
    return { url: normalized };
  }

  const path = stripMediaPrefix(normalized);
  const { path: variantPath, applied } = applyWidthVariant(path, modifiers.width);
  const url = joinURL(baseURL, variantPath);

  const params = new URLSearchParams();
  if (!applied && modifiers.width) params.set('w', String(modifiers.width));
  if (modifiers.height) params.set('h', String(modifiers.height));
  if (modifiers.quality) params.set('q', String(modifiers.quality));
  if (modifiers.format) params.set('f', String(modifiers.format));

  return { url: params.toString() ? `${url}?${params.toString()}` : url };
};

export const supportsAlias = true;
