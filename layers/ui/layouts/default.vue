<script setup>
import { watch } from "vue";
import { useNuxtApp } from "#app";
import { useAsyncData } from "#app";

const { $axios } = useNuxtApp();

const fetchPages = async () => {
  try {
    const response = await $axios.get(`/nav`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

const { data, error } = useAsyncData("pages", () => fetchPages(), {
  ssr: true,
});

const sharedLogo = useState("siteLogo", () => []);
watch(
  () => data.value?.logo,
  (logo) => {
    sharedLogo.value = Array.isArray(logo) ? logo : [];
  },
  { immediate: true },
);

const hasError = error.value;
</script>

<template>
  <article class="relative min-h-screen overflow-x-hidden">
    <div class="pointer-events-none absolute inset-x-0 top-0 h-[22rem] opacity-80" style="background:radial-gradient(circle at 50% -25%,rgba(248,207,120,.3),transparent 60%);"></div>

    <div v-if="hasError" class="container py-8 text-color-01">
      Произошла ошибка при загрузке данных
    </div>

    <Header v-if="data && !hasError" :data="data" />

    <slot />

    <Footer v-if="data && !hasError" :data="data" />
  </article>
</template>
