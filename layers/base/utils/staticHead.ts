import { parse } from 'node-html-parser'

/** Parse saved head tags without generating, normalizing or merging SEO values. */
export function staticHead(html: string) {
  const root = parse(html, { comment: false })
  const result: any = { title: root.querySelector('title')?.text || '', meta: [], link: [], script: [], style: [], noscript: [] }
  for (const tag of ['meta', 'link', 'script', 'style', 'noscript']) {
    root.querySelectorAll(tag).forEach((element, index) => {
      const entry: any = { ...element.attributes, key: `advanced-${tag}-${index}` }
      if (['script', 'style', 'noscript'].includes(tag)) entry.innerHTML = element.innerHTML
      result[tag].push(entry)
    })
  }
  const base = root.querySelector('base')
  if (base) result.base = base.attributes
  return result
}
