<script setup>

const props = defineProps({
    data: {
        type: Object,
        default: () => ({}),
    },
});
</script>

<template>
    <NuxtLink :to="data.link" class="font-font-02 text-base font-medium text-color-black text-center uppercase w-fit min-w-32 px-6 py-4 rounded-[0.4rem] relative z-10 overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-full before:bg-color-03 before:z-[-1] before:transition-[filter] before:duration-300 hover:before:brightness-[0.7]" :target="data.target || '_self'" :rel="data.rel || ''">
        {{ data.title }}
    </NuxtLink>
</template>
