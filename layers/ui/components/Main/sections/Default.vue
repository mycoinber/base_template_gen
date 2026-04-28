<script setup>
const props = defineProps({
  block: {
    type: Object,
    default: () => ({}),
  },
});
</script>

<template>
  <section :id="block._id" class="my-10 max-[541px]:my-6">
    <div class="container">
      <div class="panel-card p-5 max-[541px]:p-4">
        <h2 v-if="block.headline" class="mb-4 text-left">{{ block.headline }}</h2>
        <div
          v-if="block.content"
          v-html="block.content"
          class="rich-content overflow-hidden max-[541px]:[&_table]:block max-[541px]:[&_table]:w-full max-[541px]:[&_table]:max-w-full max-[541px]:[&_table]:overflow-x-auto max-[541px]:[&_table]:pb-2 max-[541px]:[&_table]:pr-2"
        />
      </div>
    </div>
  </section>
</template>
