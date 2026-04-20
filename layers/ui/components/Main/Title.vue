<script setup>

  const props = defineProps({
    data: {
      type: Object,
      default: () => ({}),
    },
  });
</script>

<template>
  <section class="my-8 max-[541px]:my-4">
    <div class="container">
      <div>
        <h1 class="text-center">{{ data.article.H1 }}</h1>
        <div v-html="data.article.intro"></div>
      </div>
    </div>
  </section>
</template>

