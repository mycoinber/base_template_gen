<script setup>
import { computed } from 'vue'
import { extractHtmlH2 } from '#layers/base/utils/tableOfContents'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
})

const tocItems = computed(() => {
  const article = props.data?.article || {}
  const monolithHtml = typeof article.monolithHtml === 'string'
    ? article.monolithHtml
    : typeof article.contentHtml === 'string'
      ? article.contentHtml
      : ''
  if (monolithHtml.trim()) {
    const items = extractHtmlH2(monolithHtml)
    const faqTitle = String(article.faqsTitle || '').trim()
    if (faqTitle && Array.isArray(article.faqs) && article.faqs.length) {
      items.push({ id: 'article-faqs', title: faqTitle })
    }
    return items
  }

  const blocks = Array.isArray(article.blocks) ? article.blocks : []
  return blocks.map((block, index) => {
    const title = String(block?.H2 || block?.headline || block?.title || '').trim()
    return title ? { id: String(block?._id || `section-${index + 1}`), title } : null
  }).filter(Boolean)
})
</script>

<template>
  <section v-if="tocItems.length" class="my-10 max-[541px]:my-6">
    <div class="container">
      <nav class="panel-card w-full p-5 max-[541px]:p-4">
        <details class="group">
          <summary
            class="flex w-full cursor-pointer list-none items-center justify-between select-none bg-transparent p-0 text-left [&::-webkit-details-marker]:hidden"
            data-fastgen-offer-navigation="off"
          >
          <span class="font-font-02 text-xl uppercase tracking-[0.07em] text-color-03 max-[541px]:text-base">{{
            $t('table_of_content')
          }}</span>
          <span class="inline-block text-xl text-color-soft transition-transform duration-300 group-open:rotate-180">
            <Icon name="fluent:chevron-down-16-filled" />
          </span>
          </summary>

          <div class="overflow-hidden">
          <ul
            class="flex flex-col gap-2 list-none pt-4 m-0 pl-0"
            itemscope
            itemtype="https://schema.org/ItemList"
          >
            <li
              v-for="(item, index) in tocItems"
              :key="item.id"
              class="relative m-0 rounded-[0.55rem] border border-transparent bg-background-02 py-2 pl-10 pr-3 text-sm text-color-soft transition-all duration-300 hover:border-border hover:text-color-03"
              itemprop="itemListElement"
              itemscope
              itemtype="https://schema.org/ListItem"
            >
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-[0.72rem] font-bold text-color-muted">{{ index + 1 }}.</span>
              <a :href="'#' + item.id" class="text-inherit text-sm no-underline" itemprop="url">
                <meta itemprop="position" :content="index + 1" />
                <span itemprop="name">{{ item.title }}</span>
              </a>
            </li>
          </ul>
          </div>
        </details>
      </nav>
    </div>
  </section>
</template>
