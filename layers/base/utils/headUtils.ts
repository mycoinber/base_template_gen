export const toContentString = (value: unknown) =>
  value == null ? undefined : String(value);

export const dedupeMeta = (items: Array<Record<string, string | undefined>>) => {
  const map = new Map<string, boolean>();
  const result: Array<Record<string, string | undefined>> = [];

  for (const item of items) {
    if (!item) continue;
    const key =
      typeof item.name === 'string' && item.name.length
        ? `name:${item.name}`
        : typeof item.property === 'string' && item.property.length
          ? `property:${item.property}`
          : typeof item.httpEquiv === 'string' && item.httpEquiv.length
            ? `httpEquiv:${item.httpEquiv}`
            : null;

    if (key) {
      if (map.has(key)) continue;
      map.set(key, true);
    }

    result.push(item);
  }

  return result;
};

export const dedupeLinks = (items: Array<Record<string, string | undefined>>) => {
  const map = new Map<string, boolean>();
  const result: Array<Record<string, string | undefined>> = [];

  for (const item of items) {
    if (!item) continue;
    const rel = typeof item.rel === 'string' ? item.rel : '';
    const href = typeof item.href === 'string' ? item.href : '';
    const key = rel ? `${rel}|${href}` : href;

    if (key) {
      if (map.has(key)) continue;
      map.set(key, true);
    }

    result.push(item);
  }

  return result;
};
