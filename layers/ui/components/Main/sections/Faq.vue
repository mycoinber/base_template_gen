<script setup>
import { computed, ref } from 'vue';

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

const activeIndex = ref(0);
const toggleFAQ = (index) => {
  activeIndex.value = activeIndex.value === index ? null : index;
};
</script>

<template>
  <section v-if="normalizedFaqs.length" :id="block._id" class="my-10 max-[541px]:my-6 max-[541px]:mb-8">
    <div class="container">
      <h2 class="text-left">{{ block?.headline || block?.H2 }}</h2>

      <div class="panel-card flex flex-col p-4 max-[541px]:p-3" itemscope itemtype="https://schema.org/FAQPage">
        <div
          v-for="(faq, index) in normalizedFaqs"
          :key="faq._id || index"
          class="border-b border-border py-1 last:border-b-0"
          itemscope
          itemtype="https://schema.org/Question"
          itemprop="mainEntity"
        >
          <h3
            :class="[
              'flex cursor-pointer items-center justify-between gap-4 text-[1.1rem] font-semibold transition-colors duration-300 max-[541px]:text-base',
              { 'text-color-03': activeIndex === index },
              { 'text-color-white hover:text-color-02': activeIndex !== index }
            ]"
            itemprop="name"
            @click="toggleFAQ(index)"
          >
            <span>{{ faq.question }}</span>

            <span :class="['inline-block text-xl text-color-muted transition-transform duration-300', { 'rotate-180': activeIndex === index }]">
              <Icon name="fluent:chevron-down-16-filled" />
            </span>
          </h3>

          <div
            :class="[
              'overflow-hidden transition-all duration-300',
              { 'max-h-[25rem] opacity-100 py-3 max-[541px]:py-2': activeIndex === index },
              { 'max-h-0 opacity-0': activeIndex !== index }
            ]"
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
        </div>
      </div>
    </div>
  </section>
</template>
