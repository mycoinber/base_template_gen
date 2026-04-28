<script setup>

const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
});
</script>

<template>
    <NuxtLink v-if="data.link" :to="data.link" class="eagle-cta-gold font-font-01 text-sm text-center w-fit min-w-32 px-5 py-3.5 no-underline" :target="data.target || '_self'" :rel="data.rel || ''">
        {{ data.title }}
    </NuxtLink>
    <button v-else type="button" class="eagle-cta-gold font-font-01 text-sm text-center w-fit min-w-32 px-5 py-3.5">
        {{ data.title }}
    </button>
</template>
