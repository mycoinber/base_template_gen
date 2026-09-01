export type TableOfContentsItem = {
  id: string;
  title: string;
};

const H2_PATTERN = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi;
const ID_PATTERN = /\bid\s*=\s*(["'])(.*?)\1/i;

function plainText(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value: string, fallback: number) {
  const normalized = value
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `section-${fallback + 1}`;
}

function uniqueId(candidate: string, seen: Map<string, number>) {
  const count = seen.get(candidate) || 0;
  seen.set(candidate, count + 1);
  return count ? `${candidate}-${count + 1}` : candidate;
}

function htmlHeadings(html: string) {
  const seen = new Map<string, number>();
  const entries: Array<{ attributes: string; body: string; item: TableOfContentsItem }> = [];
  let match: RegExpExecArray | null;
  let index = 0;
  H2_PATTERN.lastIndex = 0;
  while ((match = H2_PATTERN.exec(html))) {
    const attributes = match[1] || '';
    const title = plainText(match[2] || '');
    if (!title) continue;
    const existingId = attributes.match(ID_PATTERN)?.[2]?.trim();
    const id = uniqueId(existingId || slug(title, index), seen);
    entries.push({ attributes, body: match[2] || '', item: { id, title } });
    index += 1;
  }
  return entries;
}

export function extractHtmlH2(html?: string | null): TableOfContentsItem[] {
  return htmlHeadings(String(html || '')).map((entry) => entry.item);
}

/** Adds stable anchors to article H2 headings so the TOC can link to them. */
export function withH2Anchors(html?: string | null) {
  const source = String(html || '');
  const entries = htmlHeadings(source);
  let index = 0;
  H2_PATTERN.lastIndex = 0;
  return source.replace(H2_PATTERN, (full, attributes: string, body: string) => {
    const entry = entries[index++];
    if (!entry) return full;
    if (ID_PATTERN.test(attributes)) return full;
    return `<h2${attributes} id="${entry.item.id}">${body}</h2>`;
  });
}
