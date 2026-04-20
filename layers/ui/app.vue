<template>
  <NuxtLayout>
    <Analytics v-if="enableAnalytics" />
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { Analytics } from '@vercel/analytics/nuxt';

const {
  public: { vercelAnalytics },
} = useRuntimeConfig();
const enableAnalytics = Boolean(vercelAnalytics);
</script>
