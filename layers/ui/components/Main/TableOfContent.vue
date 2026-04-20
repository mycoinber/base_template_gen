<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  data: {
    type: Object,
    default: () => ({}),
  },
})

const isOpen = ref(false)

const tocItems = computed(() => {
  const blocks = Array.isArray(props.data?.article?.blocks) ? props.data.article.blocks : []
  return blocks.filter((block) => {
    const title = String(block?.H2 || block?.headline || block?.title || '').trim()
    return Boolean(title)
  })
})

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <section v-if="tocItems.length" class="my-8 max-[541px]:my-4">
    <div class="container">
      <nav
        class="w-full p-4 rounded-[0.625rem] bg-background-02"
        style="border: 1px solid var(--border)"
      >
        <div class="flex items-center justify-between cursor-pointer select-none" @click="toggle">
          <span class="text-2xl font-font-02 uppercase max-[541px]:text-xl">{{
            $t('table_of_content')
          }}</span>
          <span
            :class="[
              'inline-block transition-transform duration-300 text-2xl',
              { 'rotate-180': isOpen },
            ]"
          >
            <Icon name="fluent:chevron-down-16-filled" />
          </span>
        </div>

        <div
          :class="[
            'overflow-hidden transition-all duration-300',
            { 'max-h-[25rem] opacity-100': isOpen },
            { 'max-h-0 opacity-0': !isOpen },
          ]"
        >
          <ul
            class="flex flex-col gap-2 list-none pt-4 m-0 pl-0"
            itemscope
            itemtype="https://schema.org/ItemList"
          >
            <li
              v-for="(item, index) in tocItems"
              :key="item._id"
              class="text-color-white relative pl-8 transition-all duration-300 opacity-50 text-sm m-0 hover:text-color-01 hover:opacity-100"
              itemprop="itemListElement"
              itemscope
              itemtype="https://schema.org/ListItem"
            >
              <span class="absolute left-0 top-1/2 -translate-y-1/2">{{ index + 1 }}.</span>
              <a :href="'#' + item._id" class="text-inherit text-sm" itemprop="url">
                <meta itemprop="position" :content="index + 1" />
                <span itemprop="name">{{ item.H2 || item.headline || item.title }}</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  </section>
</template>
