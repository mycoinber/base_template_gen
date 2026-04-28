<script setup>

  const props = defineProps({
    data: {
      type: Object,
      default: () => ({}),
    },
  });
</script>

<template>
  <section class="my-10 max-[541px]:my-6">
    <div class="container">
      <div class="panel-card reveal-up px-6 py-7 max-[541px]:px-4 max-[541px]:py-5">
        <div class="mb-4 flex items-center justify-center">
          <span class="eagle-pill">Grey Eagle Guide</span>
        </div>
        <h1 class="mx-auto mb-4 max-w-[34ch] text-center">{{ data.article.H1 }}</h1>
        <div class="rich-content mx-auto max-w-[78ch]" v-html="data.article.intro"></div>
      </div>
    </div>
  </section>
</template>
