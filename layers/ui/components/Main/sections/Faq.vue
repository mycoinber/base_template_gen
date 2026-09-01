<script setup>
import { computed } from 'vue';

const props = defineProps({
  block: {
    type: Object,
    default: () => ({}),
  },
});

const normalizedFaqs = computed(() => {
  const faqs = Array.isArray(props.block?.faqs) ? props.block.faqs : [];
  return faqs.filter((faq) => {
    const question = typeof faq?.question === 'string' ? faq.question.trim() : '';
    const answer = typeof faq?.answer === 'string' ? faq.answer.trim() : '';
    return Boolean(question && answer);
  });
});

</script>

<template>
  <section v-if="normalizedFaqs.length" :id="block._id" class="my-10 max-[541px]:my-6 max-[541px]:mb-8">
    <div class="container">
      <h2 class="text-left">{{ block?.headline || block?.H2 }}</h2>

      <div class="panel-card flex flex-col p-4 max-[541px]:p-3" itemscope itemtype="https://schema.org/FAQPage">
        <details
          v-for="(faq, index) in normalizedFaqs"
          :key="faq._id || index"
          :open="index === 0"
          class="group border-b border-border py-1 last:border-b-0"
          itemscope
          itemtype="https://schema.org/Question"
          itemprop="mainEntity"
        >
          <summary
            class="flex cursor-pointer list-none items-center justify-between gap-4 text-[1.1rem] font-semibold text-color-white transition-colors duration-300 hover:text-color-02 group-open:text-color-03 max-[541px]:text-base [&::-webkit-details-marker]:hidden"
          >
            <span itemprop="name">{{ faq.question }}</span>

            <span class="inline-block text-xl text-color-muted transition-transform duration-300 group-open:rotate-180">
              <Icon name="fluent:chevron-down-16-filled" />
            </span>
          </summary>

          <div
            class="overflow-hidden py-3 max-[541px]:py-2"
            itemscope
            itemtype="https://schema.org/Answer"
            itemprop="acceptedAnswer"
          >
            <div
              class="rich-content text-sm text-color-muted [&_p:last-child]:mb-0 [&_p]:mb-3"
              itemprop="text"
              v-html="faq.answer"
            />
          </div>
        </details>
      </div>
    </div>
  </section>
</template>
