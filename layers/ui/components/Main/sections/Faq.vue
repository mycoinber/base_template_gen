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
  <section v-if="normalizedFaqs.length" :id="block._id" class="my-8 max-[541px]:my-4 max-[541px]:mb-8">
    <div class="container">
      <h2>{{ block?.headline || block?.H2 }}</h2>

      <div class="flex flex-col" itemscope itemtype="https://schema.org/FAQPage">
        <div
          v-for="(faq, index) in normalizedFaqs"
          :key="faq._id || index"
          class="border-b border-[#ddd]"
          itemscope
          itemtype="https://schema.org/Question"
          itemprop="mainEntity"
        >
          <h3
            :class="[
              'flex items-center justify-between cursor-pointer text-2xl font-bold transition-colors duration-300 max-[541px]:text-xl',
              { 'text-color-01': activeIndex === index },
              { 'hover:text-color-01': activeIndex !== index }
            ]"
            itemprop="name"
            @click="toggleFAQ(index)"
          >
            <span>{{ faq.question }}</span>

            <span :class="['inline-block transition-transform duration-300 text-2xl', { 'rotate-180': activeIndex === index }]">
              <Icon name="fluent:chevron-down-16-filled" />
            </span>
          </h3>

          <div
            :class="[
              'overflow-hidden transition-all duration-300',
              { 'max-h-[25rem] opacity-100 py-4 max-[541px]:py-2': activeIndex === index },
              { 'max-h-0 opacity-0': activeIndex !== index }
            ]"
            itemscope
            itemtype="https://schema.org/Answer"
            itemprop="acceptedAnswer"
          >
            <div
              class="text-sm [&_p:last-child]:mb-0 [&_p]:mb-3"
              itemprop="text"
              v-html="faq.answer"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
