<script setup>
import { onMounted, ref, useSSRContext } from 'vue';
import { parse } from 'node-html-parser';
import { resolveMediaPath } from '#layers/base/utils/mediaPath';

const props = defineProps({
  block: {
    type: Object,
    default: () => ({}),
  },
  page: {
    type: Object,
    default: () => ({}),
  },
});

const ssrContext = import.meta.server ? useSSRContext() : null;
const contentHtml = ref('');

const parseHTML = (html) => {
  if (!html) return '';
  if (import.meta.server) {
    const doc = parse(html);
    return doc.toString();
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return doc.body.innerHTML;
};

const updateHtml = () => {
  const raw = props.block?.content || '';
  contentHtml.value = parseHTML(raw);
};

if (import.meta.server) {
  ssrContext && (ssrContext[`block-${props.block?._id}`] = contentHtml.value);
  updateHtml();
} else {
  onMounted(updateHtml);
}

const image = computed(() => {
  if (Array.isArray(props.block?.imageUrl) && props.block.imageUrl.length) {
    return props.block.imageUrl[0];
  }
  if (props.block?.image && props.block.image.path) return props.block.image;
  return null;
});

const imageSrc = computed(() => {
  const media = image.value;
  if (!media) return '';
  const variants = Array.isArray(media.variants) ? media.variants : [];
  if (variants.length) {
    const sorted = [...variants].sort((a, b) => (b?.width || 0) - (a?.width || 0));
    if (sorted[0]?.path) return resolveMediaPath(sorted[0].path);
  }
  const fallback = media.originalPath || media.path || '';
  return fallback ? resolveMediaPath(fallback) : '';
});

const isImageLeft = computed(() => {
  const order = Number(props.block?.order ?? 0);
  if (!Number.isFinite(order)) return true;
  return order % 2 === 0;
});
</script>

<template>
  <section :id="block._id" class="my-8 max-[541px]:my-4">
    <div class="container">
      <div
        :class="[
          'flex flex-nowrap gap-8 w-full max-[541px]:flex-col',
          { 'flex-row-reverse': isImageLeft },
        ]"
      >
        <div
          class="flex-1 overflow-hidden [&_a]:text-color-01 max-[541px]:[&_table]:block max-[541px]:[&_table]:w-full max-[541px]:[&_table]:max-w-full max-[541px]:[&_table]:overflow-x-auto max-[541px]:[&_table]:pb-2 max-[541px]:[&_table]:pr-2"
        >
          <h2 v-if="block.headline" class="mb-4">{{ block.headline }}</h2>
          <div v-html="contentHtml" />
        </div>

        <div v-if="imageSrc" class="flex-1">
          <div class="w-full aspect-square rounded-[0.625rem] overflow-hidden">
            <img
              :src="imageSrc"
              :alt="image?.alt || block.headline || 'section image'"
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
